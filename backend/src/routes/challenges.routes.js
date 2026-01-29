const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');

console.log('✅ challenges.routes chargé');

// GET /api/challenges/mine - Récupérer les défis de l'utilisateur
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    // Pour l'instant, retourner une liste vide car la fonctionnalité n'est pas encore implémentée
    res.json({
      challenges: [],
      message: 'Fonctionnalité en cours de développement'
    });
  } catch (err) {
    console.error('Erreur récupération challenges:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/challenges/:id/claim - Réclamer une récompense
router.post('/:id/claim', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: false,
      message: 'Fonctionnalité en cours de développement'
    });
  } catch (err) {
    console.error('Erreur claim challenge:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
