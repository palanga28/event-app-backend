const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');

console.log('✅ notifications.routes chargé');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit;
    const offset = req.query.offset;

    const rows = await supabaseAPI.select(
      'Notifications',
      { user_id: req.user.id },
      { order: 'created_at.desc', limit: limit || 50, offset: offset || 0 }
    );

    res.json(rows);
  } catch (err) {
    console.error('Erreur list notifications:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const rows = await supabaseAPI.select(
      'Notifications',
      { user_id: req.user.id },
      { order: 'created_at.desc', limit: 500, offset: 0 }
    );

    const unread = (Array.isArray(rows) ? rows : []).filter((n) => !n.read_at);
    res.json({ unread: unread.length });
  } catch (err) {
    console.error('Erreur unread-count:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/:id/read', authMiddleware, async (req, res) => {
  const notificationId = parseInt(req.params.id, 10);
  try {
    if (!Number.isFinite(notificationId)) return res.status(400).json({ message: 'ID invalide' });

    const rows = await supabaseAPI.select('Notifications', { id: notificationId });
    const n = rows[0];
    if (!n) return res.status(404).json({ message: 'Notification introuvable' });
    if (n.user_id !== req.user.id) return res.status(403).json({ message: 'Interdit' });

    const updated = await supabaseAPI.update(
      'Notifications',
      { read_at: new Date().toISOString() },
      { id: notificationId }
    );

    res.json({ message: 'OK', notification: updated });
  } catch (err) {
    console.error('Erreur mark read:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/read-all', authMiddleware, async (req, res) => {
  try {
    const rows = await supabaseAPI.select('Notifications', { user_id: req.user.id }, { limit: 500, offset: 0, order: 'created_at.desc' });
    const unread = rows.filter((n) => !n.read_at);

    for (const n of unread) {
      try {
        await supabaseAPI.update('Notifications', { read_at: new Date().toISOString() }, { id: n.id });
      } catch {
        // ignore
      }
    }

    res.json({ message: 'OK', updated: unread.length });
  } catch (err) {
    console.error('Erreur read-all:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
