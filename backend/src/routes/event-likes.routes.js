const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');

console.log('✅ event-likes.routes chargé');

// Toggle like sur un événement
router.post('/:eventId/toggle', authMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);

  try {
    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    // Vérifier si l'événement existe
    const events = await supabaseAPI.select('Events', { id: eventId });
    if (!events || events.length === 0) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Vérifier si l'utilisateur a déjà liké
    const existingLikes = await supabaseAPI.select('EventLikes', {
      event_id: eventId,
      user_id: req.user.id
    });

    if (existingLikes && existingLikes.length > 0) {
      // Unlike
      await supabaseAPI.delete('EventLikes', {
        event_id: eventId,
        user_id: req.user.id
      });
      
      // Compter les likes restants
      const allLikes = await supabaseAPI.select('EventLikes', { event_id: eventId });
      
      return res.json({ 
        message: 'Like retiré', 
        liked: false,
        likesCount: allLikes.length
      });
    } else {
      // Like
      await supabaseAPI.insert('EventLikes', {
        event_id: eventId,
        user_id: req.user.id,
        created_at: new Date().toISOString()
      });

      // Compter les likes
      const allLikes = await supabaseAPI.select('EventLikes', { event_id: eventId });

      return res.json({ 
        message: 'Like ajouté', 
        liked: true,
        likesCount: allLikes.length
      });
    }
  } catch (err) {
    console.error('Erreur toggle like événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les likes d'un événement
router.get('/:eventId', async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);

  try {
    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    const likes = await supabaseAPI.select('EventLikes', { event_id: eventId });
    
    res.json({ 
      eventId,
      likesCount: likes.length,
      likes: likes.map(l => ({ userId: l.user_id, createdAt: l.created_at }))
    });
  } catch (err) {
    console.error('Erreur récupération likes événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
