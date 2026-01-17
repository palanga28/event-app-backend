const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const router = express.Router();
const { supabaseAPI } = require('../config/api');
const emailService = require('../services/email.service');

console.log('✅ auth.routes chargé');

function assertJwtEnv(res) {
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    res.status(500).json({ message: 'Configuration serveur invalide' });
    return false;
  }
  return true;
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  return password.length >= 6;
}

function getTokenExpiryDateFromJwt(token) {
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.exp) return null;
  return new Date(decoded.exp * 1000);
}

router.post('/register', async (req, res) => {
  const { name, email, password, bio } = req.body;

  try {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Champs requis: name, email, password' });
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Nom invalide' });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Email invalide' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ message: 'Mot de passe invalide (min 6 caractères)' });
    }

    if (bio !== undefined && bio !== null) {
      if (typeof bio !== 'string') {
        return res.status(400).json({ message: 'Bio invalide' });
      }
      if (bio.length > 300) {
        return res.status(400).json({ message: 'Bio trop longue (max 300 caractères)' });
      }
    }

    // Vérifier si l'email existe déjà (recherche exacte normalisée)
    const existingUsersExact = await supabaseAPI.select('Users', { email: normalizedEmail });
    
    if (existingUsersExact.length > 0) {
      return res.status(409).json({ message: 'Email déjà utilisé' });
    }

    // Fallback: récupérer tous les utilisateurs et vérifier manuellement (pour gérer la casse)
    // Ceci est nécessaire car l'ancien système pourrait avoir des emails avec différentes casses
    const allUsersWithSimilarEmail = await supabaseAPI.select('Users', { email: { like: normalizedEmail } });
    const emailExistsIgnoreCase = allUsersWithSimilarEmail.some(
      (u) => typeof u?.email === 'string' && u.email.trim().toLowerCase() === normalizedEmail
    );

    if (emailExistsIgnoreCase) {
      return res.status(409).json({ message: 'Email déjà utilisé' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await supabaseAPI.insert('Users', {
      name,
      email: normalizedEmail,
      password: hashed,
      role: 'user',
      bio: bio || null,
      created_at: new Date().toISOString()
    });

    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json({ message: 'Utilisateur créé avec succès', user: userWithoutPassword });
  } catch (err) {
    console.error('Erreur inscription:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!assertJwtEnv(res)) return;

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

    if (!email || !password) {
      return res.status(400).json({ message: 'Champs requis: email, password' });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Email invalide' });
    }

    if (typeof password !== 'string') {
      return res.status(400).json({ message: 'Mot de passe invalide' });
    }

    const usersExact = await supabaseAPI.select('Users', { email: normalizedEmail });
    let user = usersExact[0];

    if (!user) {
      const candidates = await supabaseAPI.select('Users', { email: { like: normalizedEmail } });
      user = (candidates || []).find(
        (u) => typeof u?.email === 'string' && u.email.trim().toLowerCase() === normalizedEmail
      );
    }

    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier si l'utilisateur est banni
    if (user.banned) {
      return res.status(403).json({ 
        message: 'Votre compte a été suspendu',
        reason: user.banned_reason || 'Violation des conditions d\'utilisation',
        banned: true
      });
    }

    if (typeof user.password !== 'string' || !user.password.startsWith('$2')) {
      // Compte existant sans hash bcrypt (ancien import / migration) => login impossible
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d' }
    );

    const expiresAt = getTokenExpiryDateFromJwt(refreshToken);
    if (!expiresAt) {
      return res.status(500).json({ message: 'Erreur génération refresh token' });
    }

    await supabaseAPI.insert('RefreshTokens', {
      token: refreshToken,
      user_id: user.id,
      expires_at: expiresAt.toISOString(),
      revoked: false,
      created_by_ip: req.ip,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      message: 'Connexion réussie',
      user: userWithoutPassword,
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('Erreur connexion:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    if (!assertJwtEnv(res)) return;

    if (!refreshToken) {
      return res.status(400).json({ message: 'refreshToken requis' });
    }

    const tokenRows = await supabaseAPI.select('RefreshTokens', { token: refreshToken });
    const stored = tokenRows[0];

    if (!stored) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔒 Refresh refused: token not found in DB');
      }
      return res.status(401).json({ message: 'Refresh token introuvable' });
    }

    if (stored.deleted_at) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔒 Refresh refused: token deleted_at set');
      }
      return res.status(401).json({ message: 'Refresh token supprimé' });
    }

    if (stored.revoked) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔒 Refresh refused: token revoked', { revoked_at: stored.revoked_at });
      }
      return res.status(401).json({ message: 'Refresh token révoqué' });
    }

    if (stored.expires_at && new Date(stored.expires_at) <= new Date()) {
      return res.status(401).json({ message: 'Refresh token expiré' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔒 Refresh refused: jwt.verify failed', e?.message);
      }
      return res.status(401).json({ message: 'Refresh token signature invalide' });
    }

    if (!decoded || !decoded.id || decoded.id !== stored.user_id) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔒 Refresh refused: decoded mismatch', {
          decodedId: decoded?.id,
          storedUserId: stored.user_id,
        });
      }
      return res.status(401).json({ message: 'Refresh token mismatch utilisateur' });
    }

    const users = await supabaseAPI.select('Users', { id: stored.user_id });
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier si l'utilisateur est banni
    if (user.banned) {
      // Révoquer le token actuel
      await supabaseAPI.update(
        'RefreshTokens',
        { revoked: true, revoked_at: new Date().toISOString() },
        { token: refreshToken }
      );
      return res.status(403).json({ 
        message: 'Votre compte a été suspendu',
        reason: user.banned_reason || 'Violation des conditions d\'utilisation',
        banned: true
      });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m' }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d' }
    );

    const newExpiresAt = getTokenExpiryDateFromJwt(newRefreshToken);
    if (!newExpiresAt) {
      return res.status(500).json({ message: 'Erreur génération refresh token' });
    }

    await supabaseAPI.update(
      'RefreshTokens',
      {
        revoked: true,
        revoked_at: new Date().toISOString(),
        replaced_by_token: newRefreshToken,
        updated_at: new Date().toISOString()
      },
      { token: refreshToken }
    );

    await supabaseAPI.insert('RefreshTokens', {
      token: newRefreshToken,
      user_id: user.id,
      expires_at: newExpiresAt.toISOString(),
      revoked: false,
      created_by_ip: req.ip,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      message: 'Token rafraîchi',
      user: userWithoutPassword,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    console.error('Erreur refresh token:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'Token manquant' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'Format du token invalide' });
    }

    const token = parts[1].replace(';', '').trim();

    if (!process.env.JWT_ACCESS_SECRET) {
      return res.status(500).json({ message: 'Configuration serveur invalide' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    const users = await supabaseAPI.select('Users', { id: decoded.id });
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const { password: _, ...userWithoutPassword } = user;

    return res.json({ user: userWithoutPassword });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token invalide' });
    }
    console.error('Erreur /auth/me:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    if (!refreshToken) {
      return res.status(400).json({ message: 'refreshToken requis' });
    }

    const tokenRows = await supabaseAPI.select('RefreshTokens', { token: refreshToken });
    const stored = tokenRows[0];

    if (!stored) {
      return res.status(200).json({ message: 'Déconnecté' });
    }

    if (stored.revoked) {
      return res.status(200).json({ message: 'Déconnecté' });
    }

    await supabaseAPI.update(
      'RefreshTokens',
      {
        revoked: true,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { token: refreshToken }
    );

    return res.json({ message: 'Déconnecté' });
  } catch (err) {
    console.error('Erreur logout:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// DEMANDER UNE RÉINITIALISATION DE MOT DE PASSE
// =========================
router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;

  try {
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email requis' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Email invalide' });
    }

    // Chercher l'utilisateur
    const usersExact = await supabaseAPI.select('Users', { email: normalizedEmail });
    let user = usersExact[0];

    if (!user) {
      const candidates = await supabaseAPI.select('Users', { email: { like: normalizedEmail } });
      user = (candidates || []).find(
        (u) => typeof u?.email === 'string' && u.email.trim().toLowerCase() === normalizedEmail
      );
    }

    // Toujours retourner succès pour éviter l'énumération d'emails
    if (!user) {
      return res.json({ 
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
        success: true 
      });
    }

    // Générer un token unique
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    // Stocker le token dans la base de données (avec service role key pour contourner RLS)
    try {
      await supabaseAPI.insert('PasswordResetTokens', {
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString()
      }, true);
    } catch (dbError) {
      console.error('❌ Erreur insertion token reset:', dbError.message);
      // La table n'existe peut-être pas - continuer quand même en mode dégradé
      console.warn('⚠️  Table PasswordResetTokens peut ne pas exister. Exécutez la migration.');
    }

    // Envoyer l'email de réinitialisation
    try {
      const emailResult = await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.name
      );

      // En développement, retourner aussi le token pour faciliter les tests
      if (emailResult && emailResult.token) {
        return res.json({ 
          message: 'Email de réinitialisation envoyé (ou token retourné en dev)',
          success: true,
          token: emailResult.token,
          resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`
        });
      }
    } catch (emailError) {
      console.error('❌ Erreur envoi email:', emailError.message);
      // Ne pas bloquer la réinitialisation si l'email échoue
    }

    return res.json({ 
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
      success: true 
    });

  } catch (err) {
    console.error('Erreur request password reset:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// RÉINITIALISER LE MOT DE PASSE AVEC TOKEN
// =========================
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Token requis' });
    }

    if (!newPassword || !isValidPassword(newPassword)) {
      return res.status(400).json({ message: 'Mot de passe invalide (min 6 caractères)' });
    }

    // Chercher le token (avec service role key pour contourner RLS)
    const tokens = await supabaseAPI.select('PasswordResetTokens', { token }, {}, true);
    const resetToken = tokens[0];

    if (!resetToken) {
      return res.status(400).json({ message: 'Token invalide ou expiré' });
    }

    // Vérifier si le token a déjà été utilisé
    if (resetToken.used) {
      return res.status(400).json({ message: 'Token déjà utilisé' });
    }

    // Vérifier si le token est expiré
    if (new Date(resetToken.expires_at) <= new Date()) {
      return res.status(400).json({ message: 'Token expiré' });
    }

    // Récupérer l'utilisateur
    const users = await supabaseAPI.select('Users', { id: resetToken.user_id });
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await supabaseAPI.update(
      'Users',
      { 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      },
      { id: user.id }
    );

    // Marquer le token comme utilisé (avec service role key)
    await supabaseAPI.update(
      'PasswordResetTokens',
      { 
        used: true,
        used_at: new Date().toISOString()
      },
      { id: resetToken.id },
      true
    );

    // Révoquer tous les refresh tokens de l'utilisateur pour forcer une nouvelle connexion
    await supabaseAPI.update(
      'RefreshTokens',
      { 
        revoked: true,
        revoked_at: new Date().toISOString()
      },
      { user_id: user.id }
    );

    return res.json({ 
      message: 'Mot de passe réinitialisé avec succès',
      success: true 
    });

  } catch (err) {
    console.error('Erreur reset password:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
