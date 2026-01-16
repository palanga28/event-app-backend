const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');

console.log('✅ favorites.routes chargé');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const rows = await supabaseAPI.select('Favorites', { user_id: req.user.id }, { order: 'created_at.desc' });
    const eventIds = rows.map((r) => r.event_id);

    if (eventIds.length === 0) return res.json([]);

    const events = await supabaseAPI.select('Events', { id: { in: eventIds }, status: 'published' }, { order: 'start_date.asc' });
    res.json(events);
  } catch (err) {
    console.error('Erreur favoris:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
