const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const { adminMiddleware, moderatorMiddleware } = require('../middlewares/role.middleware');

console.log('✅ user.routes chargé');

// =========================
// PROFIL UTILISATEUR
// =========================
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const users = await supabaseAPI.select('Users', { id: req.user.id });
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Exclure le mot de passe
    const { password, ...userSafe } = user;
    
    res.json(userSafe);
  } catch (err) {
    console.error('Erreur récupération profil:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// RECHERCHE UTILISATEURS (nom uniquement)
// =========================
router.get('/search', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = req.query.limit;
    const offset = req.query.offset;

    if (!q) return res.json([]);

    const users = await supabaseAPI.select('Users', { name: { like: q } }, { limit, offset, order: 'created_at.desc' });

    // Filtrer les utilisateurs bannis et ne pas exposer email (hors admin/mod)
    const safe = users
      .filter((u) => !u.banned)
      .map((u) => ({ id: u.id, name: u.name, avatar_url: u.avatar_url || null, bio: u.bio || null }));
    res.json(safe);
  } catch (err) {
    console.error('Erreur recherche utilisateurs:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// PROFIL PUBLIC (pour follow/stories)
// =========================
router.get('/:id/public', async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  try {
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const users = await supabaseAPI.select('Users', { id: userId });
    const u = users[0];

    if (!u) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Masquer les utilisateurs bannis
    if (u.banned) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ 
      id: u.id, 
      name: u.name, 
      avatar_url: u.avatar_url || null, 
      bio: u.bio || null,
      is_verified_organizer: u.is_verified_organizer || false
    });
  } catch (err) {
    console.error('Erreur récupération profil public:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// STATISTIQUES FOLLOW (followers/following)
// =========================
router.get('/:id/follow-stats', async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  try {
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    // Compter les followers (ceux qui suivent cet utilisateur)
    const followers = await supabaseAPI.select('Follows', { following_id: userId });
    
    // Compter les following (ceux que cet utilisateur suit)
    const following = await supabaseAPI.select('Follows', { follower_id: userId });

    res.json({
      followers: followers.length,
      following: following.length
    });
  } catch (err) {
    console.error('Erreur récupération stats follow:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// METTRE À JOUR PROFIL
// =========================
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, email, avatarUrl, bio } = req.body;

  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && typeof avatarUrl !== 'string') {
        return res.status(400).json({ message: 'avatarUrl invalide' });
      }
      updateData.avatar_url = avatarUrl;
    }

    if (bio !== undefined) {
      if (bio !== null && typeof bio !== 'string') {
        return res.status(400).json({ message: 'bio invalide' });
      }
      if (typeof bio === 'string' && bio.length > 300) {
        return res.status(400).json({ message: 'Bio trop longue (max 300 caractères)' });
      }
      updateData.bio = bio;
    }

    const user = await supabaseAPI.update('Users', updateData, { id: req.user.id });

    // Exclure le mot de passe
    const { password, ...userSafe } = user;
    
    res.json({ message: 'Profil mis à jour', user: userSafe });
  } catch (err) {
    console.error('Erreur mise à jour profil:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// CHANGER MOT DE PASSE
// =========================
router.put('/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Vérifier le mot de passe actuel
    const users = await supabaseAPI.select('Users', { id: req.user.id });
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await supabaseAPI.update('Users', { password: hashedNewPassword }, { id: req.user.id });

    res.json({ message: 'Mot de passe changé avec succès' });
  } catch (err) {
    console.error('Erreur changement mot de passe:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// LISTE UTILISATEURS (ADMIN/MOD)
// =========================
router.get('/all', authMiddleware, moderatorMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit;
    const offset = req.query.offset;
    const nameLike = req.query.nameLike;
    const emailLike = req.query.emailLike;

    const filters = {};
    if (nameLike) filters.name = { like: nameLike };
    if (emailLike) filters.email = { like: emailLike };

    const users = await supabaseAPI.select('Users', filters, { limit, offset, order: 'created_at.desc' });
    
    // Exclure les mots de passe
    const usersSafe = users.map(user => {
      const { password, ...userSafe } = user;
      return userSafe;
    });

    res.json(usersSafe);
  } catch (err) {
    console.error('Erreur récupération utilisateurs:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// DÉTAILS UTILISATEUR (ADMIN/MOD)
// =========================
router.get('/:id', authMiddleware, moderatorMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  try {
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const users = await supabaseAPI.select('Users', { id: userId });
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Inclure les statistiques de l'utilisateur
    const [events, tickets] = await Promise.all([
      supabaseAPI.select('Events', { organizer_id: userId }),
      supabaseAPI.select('Tickets', { user_id: userId })
    ]);

    // Exclure le mot de passe
    const { password, ...userSafe } = user;

    res.json({
      ...userSafe,
      stats: {
        eventsCreated: events.length,
        ticketsPurchased: tickets.length,
        totalSpent: tickets.reduce((sum, ticket) => sum + parseFloat(ticket.price_paid || 0), 0)
      }
    });
  } catch (err) {
    console.error('Erreur détails utilisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// METTRE À JOUR RÔLE UTILISATEUR (ADMIN SEULEMENT)
// =========================
router.put('/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const userId = parseInt(id);

  try {
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    // Empêcher la modification du rôle du dernier admin
    if (userId === req.user.id && role !== 'admin') {
      return res.status(400).json({ message: 'Impossible de modifier votre propre rôle administrateur' });
    }

    const user = await supabaseAPI.update('Users', { role }, { id: userId });

    res.json({ message: `Rôle de l'utilisateur ${userId} mis à jour vers ${role}`, user });
  } catch (err) {
    console.error('Erreur mise à jour rôle:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
