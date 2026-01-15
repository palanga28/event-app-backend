const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');

console.log('✅ comments.routes chargé');

router.put('/:id', authMiddleware, async (req, res) => {
  const commentId = parseInt(req.params.id, 10);
  const { content } = req.body;

  try {
    if (!Number.isFinite(commentId)) return res.status(400).json({ message: 'ID invalide' });
    if (!content || typeof content !== 'string' || content.trim().length < 1) {
      return res.status(400).json({ message: 'Contenu invalide' });
    }

    const rows = await supabaseAPI.select('Comments', { id: commentId });
    const comment = rows[0];
    if (!comment || comment.deleted_at) return res.status(404).json({ message: 'Commentaire introuvable' });

    const isOwner = comment.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Interdit' });
    }

    const updated = await supabaseAPI.update(
      'Comments',
      { content: content.trim(), updated_at: new Date().toISOString() },
      { id: commentId }
    );

    res.json({ message: 'Commentaire modifié', comment: updated });
  } catch (err) {
    console.error('Erreur edit comment:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const commentId = parseInt(req.params.id, 10);

  try {
    if (!Number.isFinite(commentId)) return res.status(400).json({ message: 'ID invalide' });

    const rows = await supabaseAPI.select('Comments', { id: commentId });
    const comment = rows[0];
    if (!comment || comment.deleted_at) return res.status(404).json({ message: 'Commentaire introuvable' });

    const isOwner = comment.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Interdit' });
    }

    await supabaseAPI.update('Comments', { deleted_at: new Date().toISOString() }, { id: commentId });

    res.json({ message: 'Commentaire supprimé' });
  } catch (err) {
    console.error('Erreur delete comment:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
