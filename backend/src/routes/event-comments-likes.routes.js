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

    // 1. Récupérer tous les commentaires de l'événement (sans filtre deleted_at pour éviter problème null)
    const allComments = await supabaseAPI.select('Comments', { 
      event_id: eventId
    });
    const comments = allComments.filter(c => !c.deleted_at);
    
    console.log(`📝 Commentaires pour event ${eventId}: ${comments.length} sur ${allComments.length}`);

    if (!comments || comments.length === 0) {
      return res.json({ likes: {} });
    }

    const commentIds = comments.map(c => c.id);
    console.log(`📝 Comment IDs:`, commentIds);

    // 2. Récupérer TOUS les likes de la table puis filtrer (pour contourner problème filtre IN)
    const allLikesRaw = await supabaseAPI.select('CommentLikes', {}, {}, true);
    const allLikes = allLikesRaw.filter(l => commentIds.includes(l.comment_id));
    
    console.log(`📊 Total likes trouvés: ${allLikes.length}/${allLikesRaw.length}`, allLikes.length > 0 ? JSON.stringify(allLikes.slice(0, 5)) : '[]');

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
