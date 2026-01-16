const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');

console.log('✅ stories.routes chargé');

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

router.get('/', async (req, res) => {
  try {
    // Stories privées: utiliser /visible (auth requis)
    res.json([]);
  } catch (err) {
    console.error('Erreur récupération stories:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/visible', authMiddleware, async (req, res) => {
  try {
    const now = new Date().toISOString();

    const stories = await supabaseAPI.select(
      'Stories',
      { expires_at: { gt: now } },
      { order: 'created_at.desc', limit: req.query.limit || 50 }
    );

    if (stories.length === 0) return res.json([]);

    const authorIds = Array.from(new Set(stories.map((s) => s.user_id).filter(Boolean)));

    // Relations follow dans les deux sens (viewer -> author) ou (author -> viewer)
    const followsOut = await supabaseAPI.select('Follows', { follower_id: req.user.id });
    const followsIn = await supabaseAPI.select('Follows', { following_id: req.user.id });

    const viewerFollows = new Set(followsOut.map((r) => r.following_id));
    const followsViewer = new Set(followsIn.map((r) => r.follower_id));

    const visibleAuthorIds = new Set([
      req.user.id,
      ...authorIds.filter((id) => viewerFollows.has(id) || followsViewer.has(id)),
    ]);

    const visibleStories = stories.filter((s) => visibleAuthorIds.has(s.user_id));

    const userIds = Array.from(new Set(visibleStories.map((s) => s.user_id).filter(Boolean)));
    const users = userIds.length ? await supabaseAPI.select('Users', { id: { in: userIds } }) : [];
    // Filtrer les utilisateurs bannis
    const activeUsers = users.filter((u) => !u.banned);
    const userById = new Map(activeUsers.map((u) => [u.id, u]));

    // Exclure les stories des utilisateurs bannis
    const withUsers = visibleStories
      .filter((s) => userById.has(s.user_id))
      .map((s) => {
        const u = userById.get(s.user_id);
        return {
          ...s,
          user: u
            ? { id: u.id, name: u.name, email: u.email, avatar_url: u.avatar_url || null, bio: u.bio || null }
            : null,
        };
      });

    res.json(withUsers);
  } catch (err) {
    console.error('Erreur récupération stories visibles:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const now = new Date().toISOString();

    const stories = await supabaseAPI.select(
      'Stories',
      { user_id: req.user.id, expires_at: { gt: now } },
      { order: 'created_at.desc', limit: req.query.limit || 50 }
    );

    res.json(stories);
  } catch (err) {
    console.error('Erreur récupération mes stories:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { imageUrl, caption } = req.body;

  try {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ message: 'imageUrl requis' });
    }

    if (caption !== undefined && caption !== null) {
      if (typeof caption !== 'string') {
        return res.status(400).json({ message: 'caption invalide' });
      }
      if (caption.length > 200) {
        return res.status(400).json({ message: 'caption trop long (max 200 caractères)' });
      }
    }

    const now = new Date();
    const expiresAt = addHours(now, 24);

    const story = await supabaseAPI.insert('Stories', {
      user_id: req.user.id,
      image_url: imageUrl.trim(),
      caption: caption || null,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    // Ajouter une entrée d'activité pour les modérateurs
    try {
      await supabaseAPI.insert('AuditLogs', {
        actor_id: req.user.id,
        action: 'story_published',
        entity_type: 'story',
        entity_id: story.id,
        metadata: {
          caption: caption || '',
          expires_at: expiresAt.toISOString()
        },
        ip: req.ip,
        created_at: now.toISOString()
      });
    } catch (logErr) {
      console.warn('Warn: failed to create audit log for story publication:', logErr?.message || logErr);
    }

    res.status(201).json({ message: 'Story créée', story });
  } catch (err) {
    console.error('Erreur création story:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
