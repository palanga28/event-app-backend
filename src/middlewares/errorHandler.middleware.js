/**
 * Middleware de gestion centralisée des erreurs
 */

const errorHandler = (err, req, res, next) => {
  console.error('❌ Erreur non gérée:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

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

  // Erreur par défaut
  res.status(err.status || 500).json({
    message: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;


