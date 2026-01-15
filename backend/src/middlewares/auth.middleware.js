const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  // Vérification de la présence du token
  if (!authHeader) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  // Vérification du format attendu : "Bearer TOKEN"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Format du token invalide' });
  }

  // Nettoyage du token
  const token = parts[1].replace(';', '').trim();

  // Vérification du token
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'Configuration serveur invalide' });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token invalide' });
    }

    return res.status(403).json({ message: 'Erreur de vérification du token' });
  }
};
