const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');

console.log('✅ comment-likes.routes chargé');

// Toggle like sur un commentaire
router.post('/:commentId/toggle', authMiddleware, async (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);

  try {
    if (!Number.isFinite(commentId)) {
      return res.status(400).json({ message: 'ID commentaire invalide' });
    }

    console.log(`🔄 Toggle like pour commentaire ${commentId} par user ${req.user.id}`);

    // Vérifier si le commentaire existe
    const comments = await supabaseAPI.select('Comments', { id: commentId });
    if (!comments || comments.length === 0 || comments[0].deleted_at) {
      return res.status(404).json({ message: 'Commentaire non trouvé' });
    }

    console.log('✅ Commentaire trouvé');

    // Vérifier si l'utilisateur a déjà liké (useServiceRole pour RLS)
    const existingLikes = await supabaseAPI.select('CommentLikes', {
      comment_id: commentId,
      user_id: req.user.id
    }, {}, true);

    console.log(`📊 Likes existants: ${existingLikes.length}`);

    if (existingLikes && existingLikes.length > 0) {
      // Unlike
      console.log('➖ Unlike en cours...');
      await supabaseAPI.delete('CommentLikes', {
        comment_id: commentId,
        user_id: req.user.id
      }, true);
      
      // Compter les likes restants (useServiceRole)
      const allLikes = await supabaseAPI.select('CommentLikes', { comment_id: commentId }, {}, true);
      
      console.log(`✅ Unlike réussi. Total: ${allLikes.length}`);
      return res.json({ 
        message: 'Like retiré', 
        liked: false,
        likesCount: allLikes.length
      });
    } else {
      // Like
      console.log('➕ Like en cours...');
      await supabaseAPI.insert('CommentLikes', {
        comment_id: commentId,
        user_id: req.user.id,
        created_at: new Date().toISOString()
      }, true);

      // Compter les likes (useServiceRole)
      const allLikes = await supabaseAPI.select('CommentLikes', { comment_id: commentId }, {}, true);

      console.log(`✅ Like réussi. Total: ${allLikes.length}`);
      return res.json({ 
        message: 'Like ajouté', 
        liked: true,
        likesCount: allLikes.length
      });
    }
  } catch (err) {
    console.error('❌ Erreur toggle like commentaire:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Obtenir les likes d'un commentaire
router.get('/:commentId', async (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);

  try {
    if (!Number.isFinite(commentId)) {
      return res.status(400).json({ message: 'ID commentaire invalide' });
    }

    const likes = await supabaseAPI.select('CommentLikes', { comment_id: commentId }, {}, true);
    
    res.json({ 
      commentId,
      likesCount: likes.length,
      likes: likes.map(l => ({ userId: l.user_id, createdAt: l.created_at }))
    });
  } catch (err) {
    console.error('Erreur récupération likes commentaire:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
