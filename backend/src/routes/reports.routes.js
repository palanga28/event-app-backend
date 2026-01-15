const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');

console.log('✅ reports.routes chargé');

router.post('/', authMiddleware, async (req, res) => {
  const { type, targetId, reason } = req.body;

  try {
    if (!type || !targetId) {
      return res.status(400).json({ message: 'Champs requis: type, targetId' });
    }

    if (!['event', 'user'].includes(type)) {
      return res.status(400).json({ message: 'Type invalide' });
    }

    const parsedTargetId = parseInt(targetId);
    if (isNaN(parsedTargetId) || parsedTargetId <= 0) {
      return res.status(400).json({ message: 'targetId invalide' });
    }

    if (type === 'event') {
      const events = await supabaseAPI.select('Events', { id: parsedTargetId });
      if (!events[0]) {
        return res.status(404).json({ message: 'Événement non trouvé' });
      }
    }

    if (type === 'user') {
      const users = await supabaseAPI.select('Users', { id: parsedTargetId });
      if (!users[0]) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
    }

    if (reason !== undefined && reason !== null) {
      if (typeof reason !== 'string') {
        return res.status(400).json({ message: 'Reason invalide' });
      }

      if (reason.length > 1000) {
        return res.status(400).json({ message: 'Reason trop long (max 1000 caractères)' });
      }
    }

    const report = await supabaseAPI.insert('Reports', {
      type,
      target_id: parsedTargetId,
      reason: reason ? reason : null,
      status: 'pending',
      reported_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.status(201).json({ message: 'Signalement créé', report });
  } catch (err) {
    console.error('Erreur création signalement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
