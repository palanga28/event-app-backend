const { supabaseAPI } = require('../config/api');

// Middleware pour vérifier les rôles depuis Supabase
const checkRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      // Récupérer les informations de l'utilisateur depuis Supabase
      const users = await supabaseAPI.select('Users', { id: req.user.id });
      const user = users[0];

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Vérifier le rôle
      if (user.role !== requiredRole && user.role !== 'admin') {
        // Les admins ont accès à tout
        return res.status(403).json({ 
          message: `Accès ${requiredRole} requis`,
          currentRole: user.role,
          requiredRole: requiredRole
        });
      }

      // Ajouter les informations de rôle à la requête
      req.user.role = user.role;
      
      next();
    } catch (error) {
      console.error('Erreur vérification rôle:', error);
      return res.status(500).json({ message: 'Erreur serveur lors de la vérification du rôle' });
    }
  };
};

// Middleware pour vérifier si l'utilisateur est administrateur
const adminMiddleware = async (req, res, next) => {
  try {
    const users = await supabaseAPI.select('Users', { id: req.user.id });
    const user = users[0];

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Accès administrateur requis',
        currentRole: user?.role || 'unknown'
      });
    }

    req.user.role = user.role;
    next();
  } catch (error) {
    console.error('Erreur vérification admin:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Middleware pour vérifier si l'utilisateur est modérateur ou admin
const moderatorMiddleware = async (req, res, next) => {
  try {
    const users = await supabaseAPI.select('Users', { id: req.user.id });
    const user = users[0];

    if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
      return res.status(403).json({ 
        message: 'Accès modérateur requis',
        currentRole: user?.role || 'unknown'
      });
    }

    req.user.role = user.role;
    next();
  } catch (error) {
    console.error('Erreur vérification modérateur:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Middleware pour vérifier si l'utilisateur est le propriétaire ou a un rôle supérieur
const ownerOrRoleMiddleware = (requiredRole = 'user') => {
  return async (req, res, next) => {
    try {
      const users = await supabaseAPI.select('Users', { id: req.user.id });
      const user = users[0];

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Vérifier si l'utilisateur est le propriétaire ou a un rôle suffisant
      const isOwner = req.params.userId && parseInt(req.params.userId) === user.id;
      const hasRequiredRole = user.role === 'admin' || 
                             (requiredRole === 'moderator' && (user.role === 'moderator' || user.role === 'admin')) ||
                             (requiredRole === 'user');

      if (!isOwner && !hasRequiredRole) {
        return res.status(403).json({ 
          message: 'Accès non autorisé',
          currentRole: user.role,
          isOwner: isOwner,
          hasRequiredRole: hasRequiredRole
        });
      }

      req.user.role = user.role;
      next();
    } catch (error) {
      console.error('Erreur vérification propriétaire/rôle:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  };
};

module.exports = {
  checkRole,
  adminMiddleware,
  moderatorMiddleware,
  ownerOrRoleMiddleware
};
