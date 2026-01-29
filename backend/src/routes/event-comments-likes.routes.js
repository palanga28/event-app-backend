const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const optionalAuthMiddleware = require('../middlewares/optionalAuth.middleware');

console.log('✅ event-comments-likes.routes chargé');

// Obtenir tous les likes de tous les commentaires d'un événement en une seule requête
router.get('/:eventId/comments-likes', optionalAuthMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);

  try {
    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    // 1. Récupérer tous les commentaires de l'événement
    const comments = await supabaseAPI.select('Comments', { 
      event_id: eventId,
      deleted_at: null 
    });

    if (!comments || comments.length === 0) {
      return res.json({ likes: {} });
    }

    const commentIds = comments.map(c => c.id);
    console.log(`📝 Comment IDs pour event ${eventId}:`, commentIds);

    // 2. Récupérer tous les likes pour ces commentaires (useServiceRole pour RLS)
    const allLikes = await supabaseAPI.select('CommentLikes', {
      comment_id: { in: commentIds }
    }, {}, true);
    
    console.log(`📊 Total likes trouvés: ${allLikes.length}`, allLikes.length > 0 ? JSON.stringify(allLikes.slice(0, 5)) : '[]');

    // 3. Grouper les likes par commentaire
    const likesByComment = {};
    commentIds.forEach(id => {
      likesByComment[id] = {
        count: 0,
        userIds: [],
        isLikedByCurrentUser: false
      };
    });

    allLikes.forEach(like => {
      const commentId = like.comment_id;
      if (likesByComment[commentId]) {
        likesByComment[commentId].count++;
        likesByComment[commentId].userIds.push(like.user_id);
        
        // Si l'utilisateur est connecté, vérifier s'il a liké
        if (req.user && like.user_id === req.user.id) {
          likesByComment[commentId].isLikedByCurrentUser = true;
        }
      }
    });

    res.json({ likes: likesByComment });
  } catch (err) {
    console.error('Erreur récupération likes événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
