const jwt = require('jsonwebtoken');

// Middleware d'authentification optionnel
// Si un token valide est présent, req.user sera défini
// Sinon, la requête continue sans erreur
module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  // Pas de token = continuer sans user
  if (!authHeader) {
    req.user = null;
    return next();
  }

  // Vérification du format attendu : "Bearer TOKEN"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    req.user = null;
    return next();
  }

  // Nettoyage du token
  const token = parts[1].replace(';', '').trim();

  // Vérification du token
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    // Token invalide ou expiré = continuer sans user
    req.user = null;
    next();
  }
};
