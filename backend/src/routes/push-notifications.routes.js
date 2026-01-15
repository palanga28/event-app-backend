const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const PushNotificationService = require('../services/push-notification.service');

console.log('✅ push-notifications.routes chargé');

// =========================
// ENREGISTRER UN TOKEN PUSH
// =========================
router.post('/register-token', authMiddleware, async (req, res) => {
  const user = req.user;
  const { pushToken, deviceId } = req.body;

  try {
    if (!pushToken || !deviceId) {
      return res.status(400).json({ 
        message: 'pushToken et deviceId requis' 
      });
    }

    const token = await PushNotificationService.registerPushToken(
      user.id,
      pushToken,
      deviceId
    );

    res.json({
      message: 'Token enregistré avec succès',
      token,
    });
  } catch (error) {
    console.error('❌ Erreur enregistrement token:', error);
    res.status(500).json({ 
      message: error.message || 'Erreur serveur' 
    });
  }
});

// =========================
// SUPPRIMER UN TOKEN PUSH
// =========================
router.post('/unregister-token', authMiddleware, async (req, res) => {
  const user = req.user;
  const { deviceId } = req.body;

  try {
    if (!deviceId) {
      return res.status(400).json({ message: 'deviceId requis' });
    }

    await PushNotificationService.unregisterPushToken(user.id, deviceId);

    res.json({
      message: 'Token supprimé avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur suppression token:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// ENVOYER UNE NOTIFICATION DE TEST
// =========================
router.post('/test', authMiddleware, async (req, res) => {
  const user = req.user;

  try {
    const result = await PushNotificationService.sendNotification(
      [user.id],
      {
        title: '🧪 Notification de test',
        body: 'Si tu vois ce message, les notifications fonctionnent !',
        data: {
          type: 'test',
        },
      }
    );

    res.json({
      message: 'Notification de test envoyée',
      result,
    });
  } catch (error) {
    console.error('❌ Erreur envoi notification test:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// ENVOYER UNE NOTIFICATION PERSONNALISÉE (ADMIN)
// =========================
router.post('/send', authMiddleware, async (req, res) => {
  const user = req.user;
  const { userIds, title, body, data } = req.body;

  try {
    // Vérifier que l'utilisateur est admin
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Seuls les admins peuvent envoyer des notifications' 
      });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        message: 'userIds requis (tableau d\'IDs)' 
      });
    }

    if (!title || !body) {
      return res.status(400).json({ 
        message: 'title et body requis' 
      });
    }

    const result = await PushNotificationService.sendNotification(
      userIds,
      { title, body, data: data || {} }
    );

    res.json({
      message: 'Notification envoyée',
      result,
    });
  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// ENVOYER À TOUS LES UTILISATEURS (ADMIN)
// =========================
router.post('/send-all', authMiddleware, async (req, res) => {
  const user = req.user;
  const { title, body, data } = req.body;

  try {
    // Vérifier que l'utilisateur est admin
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Seuls les admins peuvent envoyer des notifications globales' 
      });
    }

    if (!title || !body) {
      return res.status(400).json({ 
        message: 'title et body requis' 
      });
    }

    const result = await PushNotificationService.sendToAll({
      title,
      body,
      data: data || {},
    });

    res.json({
      message: 'Notification globale envoyée',
      result,
    });
  } catch (error) {
    console.error('❌ Erreur envoi notification globale:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
