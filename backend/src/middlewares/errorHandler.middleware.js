/**
 * Middleware de gestion centralisée des erreurs
 */

const { log } = require('../config/logger');

// Fonction d'alerte pour les erreurs critiques
async function sendCriticalAlert(error, req) {
  const alertWebhook = process.env.ALERT_WEBHOOK_URL;
  
  if (!alertWebhook) return;

  try {
    const alertPayload = {
      text: `🚨 *Erreur Critique - AMPIA Events*`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🚨 Erreur 500 détectée*\n\n*Message:* ${error.message}\n*Path:* \`${req.method} ${req.path}\`\n*IP:* ${req.ip}\n*Time:* ${new Date().toISOString()}`
          }
        }
      ]
    };

    await fetch(alertWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertPayload)
    });
  } catch (alertError) {
    console.error('Erreur envoi alerte:', alertError.message);
  }
}

const errorHandler = (err, req, res, next) => {
  const errorDetails = {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || null
  };

  // Logger l'erreur
  log.error('Erreur non gérée', errorDetails);
  console.error('❌ Erreur non gérée:', errorDetails);

  // Erreurs de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Erreur de validation',
      details: err.details
    });
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Token invalide'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expiré'
    });
  }

  // Erreurs Supabase
  if (err.code === 'PGRST116') {
    return res.status(404).json({
      message: 'Ressource non trouvée'
    });
  }

  if (err.code === 'PGRST301') {
    return res.status(400).json({
      message: 'Requête invalide'
    });
  }

  if (err.code === 'PGRST200') {
    return res.status(400).json({
      message: 'Format de données invalide'
    });
  }

  // Erreur par défaut (500)
  const statusCode = err.status || 500;
  
  // Envoyer une alerte pour les erreurs 500
  if (statusCode >= 500) {
    sendCriticalAlert(err, req);
  }

  res.status(statusCode).json({
    message: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;


