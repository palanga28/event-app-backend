const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');

console.log('✅ follows.routes chargé');

router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const followerRows = await supabaseAPI.select('Follows', { following_id: req.user.id });
    const followingRows = await supabaseAPI.select('Follows', { follower_id: req.user.id });

    const allUserIds = [
      ...followerRows.map((r) => r.follower_id),
      ...followingRows.map((r) => r.following_id)
    ];
    const uniqueUserIds = Array.from(new Set(allUserIds));
    
    // Filtrer les utilisateurs bannis
    const users = uniqueUserIds.length ? await supabaseAPI.select('Users', { id: { in: uniqueUserIds } }) : [];
    const bannedIds = new Set(users.filter((u) => u.banned).map((u) => u.id));

    const followerIds = followerRows.map((r) => r.follower_id).filter((id) => !bannedIds.has(id));
    const followingIds = followingRows.map((r) => r.following_id).filter((id) => !bannedIds.has(id));

    res.json({ followerIds, followingIds });
  } catch (err) {
    console.error('Erreur récupération follows:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/:userId', authMiddleware, async (req, res) => {
  const targetId = parseInt(req.params.userId, 10);
  if (!Number.isFinite(targetId)) {
    return res.status(400).json({ message: 'userId invalide' });
  }

  if (targetId === req.user.id) {
    return res.status(400).json({ message: 'Impossible de se follow soi-même' });
  }

  try {
    // Vérifier si l'utilisateur cible est banni
    const targetUsers = await supabaseAPI.select('Users', { id: targetId });
    const targetUser = targetUsers[0];
    if (!targetUser || targetUser.banned) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const follow = await supabaseAPI.insert('Follows', {
      follower_id: req.user.id,
      following_id: targetId,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({ message: 'Follow OK', follow });
  } catch (err) {
    // Conflit unique: déjà follow
    const msg = err?.response?.data?.message || err?.message || '';
    if (String(msg).toLowerCase().includes('duplicate') || String(msg).toLowerCase().includes('unique')) {
      return res.status(200).json({ message: 'Déjà follow' });
    }
    console.error('Erreur follow:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/:userId', authMiddleware, async (req, res) => {
  const targetId = parseInt(req.params.userId, 10);
  if (!Number.isFinite(targetId)) {
    return res.status(400).json({ message: 'userId invalide' });
  }

  if (targetId === req.user.id) {
    return res.status(400).json({ message: 'Impossible de unfollow soi-même' });
  }

  try {
    await supabaseAPI.delete('Follows', { follower_id: req.user.id, following_id: targetId });
    res.json({ message: 'Unfollow OK' });
  } catch (err) {
    console.error('Erreur unfollow:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
