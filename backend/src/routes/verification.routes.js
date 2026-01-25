const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/role.middleware');

console.log('✅ verification.routes chargé');

// =============================================
// ROUTES UTILISATEUR (demande de vérification)
// =============================================

/**
 * GET /api/verification/status
 * Récupère le statut de vérification de l'utilisateur connecté
 */
router.get('/status', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    // Récupérer les infos utilisateur
    const users = await supabaseAPI.select('Users', { id: userId });
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Récupérer la demande de vérification si elle existe
    const verifications = await supabaseAPI.select('OrganizerVerifications', { user_id: userId });
    const verification = verifications[0];

    res.json({
      isVerified: user.is_verified_organizer || false,
      canSellTickets: user.can_sell_tickets || false,
      verifiedAt: user.verified_at,
      verification: verification ? {
        id: verification.id,
        status: verification.status,
        rejectionReason: verification.rejection_reason,
        createdAt: verification.created_at,
        reviewedAt: verification.reviewed_at,
      } : null,
    });
  } catch (err) {
    console.error('Erreur récupération statut vérification:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/verification/request
 * Soumettre une demande de vérification organisateur
 */
router.post('/request', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const {
    fullName,
    phoneNumber,
    businessName,
    businessType,
    idDocumentUrl,
    idDocumentBackUrl,
    businessDocumentUrl,
    selfieUrl,
    facebookUrl,
    instagramUrl,
    twitterUrl,
    websiteUrl,
  } = req.body;

  try {
    // Vérifier si une demande existe déjà
    const existing = await supabaseAPI.select('OrganizerVerifications', { user_id: userId });
    
    if (existing.length > 0) {
      const currentStatus = existing[0].status;
      
      if (currentStatus === 'approved') {
        return res.status(400).json({ message: 'Vous êtes déjà vérifié' });
      }
      
      if (currentStatus === 'pending' || currentStatus === 'under_review') {
        return res.status(400).json({ message: 'Une demande est déjà en cours de traitement' });
      }
      
      // Si rejeté ou suspendu, permettre une nouvelle demande (mise à jour)
      const updated = await supabaseAPI.update('OrganizerVerifications', {
        full_name: fullName,
        phone_number: phoneNumber,
        business_name: businessName,
        business_type: businessType || 'individual',
        id_document_url: idDocumentUrl,
        id_document_back_url: idDocumentBackUrl,
        business_document_url: businessDocumentUrl,
        selfie_url: selfieUrl,
        facebook_url: facebookUrl,
        instagram_url: instagramUrl,
        twitter_url: twitterUrl,
        website_url: websiteUrl,
        status: 'pending',
        rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null,
      }, { user_id: userId });

      return res.json({
        message: 'Demande de vérification mise à jour',
        verification: updated,
      });
    }

    // Créer une nouvelle demande
    const verification = await supabaseAPI.insert('OrganizerVerifications', {
      user_id: userId,
      full_name: fullName,
      phone_number: phoneNumber,
      business_name: businessName,
      business_type: businessType || 'individual',
      id_document_url: idDocumentUrl,
      id_document_back_url: idDocumentBackUrl,
      business_document_url: businessDocumentUrl,
      selfie_url: selfieUrl,
      facebook_url: facebookUrl,
      instagram_url: instagramUrl,
      twitter_url: twitterUrl,
      website_url: websiteUrl,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Demande de vérification soumise avec succès',
      verification,
    });
  } catch (err) {
    console.error('Erreur soumission demande vérification:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =============================================
// ROUTES ADMIN (gestion des vérifications)
// =============================================

/**
 * GET /api/verification/admin/requests
 * Liste toutes les demandes de vérification (admin)
 */
router.get('/admin/requests', authMiddleware, adminMiddleware, async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Construire le filtre
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Récupérer les demandes
    const verifications = await supabaseAPI.select(
      'OrganizerVerifications',
      filter,
      { limit: parseInt(limit), offset, order: 'created_at.desc' }
    );

    // Récupérer les infos utilisateurs
    const userIds = verifications.map(v => v.user_id);
    const users = userIds.length > 0 
      ? await supabaseAPI.select('Users', {}, { limit: 1000 })
      : [];
    
    const usersMap = new Map(users.map(u => [u.id, u]));

    // Enrichir les données
    const enriched = verifications.map(v => ({
      ...v,
      user: usersMap.get(v.user_id) ? {
        id: usersMap.get(v.user_id).id,
        name: usersMap.get(v.user_id).name,
        email: usersMap.get(v.user_id).email,
        avatar_url: usersMap.get(v.user_id).avatar_url,
      } : null,
    }));

    // Compter par statut
    const allVerifications = await supabaseAPI.select('OrganizerVerifications', {}, { limit: 10000 });
    const stats = {
      pending: allVerifications.filter(v => v.status === 'pending').length,
      under_review: allVerifications.filter(v => v.status === 'under_review').length,
      approved: allVerifications.filter(v => v.status === 'approved').length,
      rejected: allVerifications.filter(v => v.status === 'rejected').length,
      total: allVerifications.length,
    };

    res.json({
      requests: enriched,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: stats.total,
      },
    });
  } catch (err) {
    console.error('Erreur récupération demandes vérification:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/verification/admin/requests/:id
 * Détails d'une demande de vérification (admin)
 */
router.get('/admin/requests/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const verificationId = parseInt(req.params.id);

  try {
    const verifications = await supabaseAPI.select('OrganizerVerifications', { id: verificationId });
    const verification = verifications[0];

    if (!verification) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    // Récupérer l'utilisateur
    const users = await supabaseAPI.select('Users', { id: verification.user_id });
    const user = users[0];

    // Récupérer les événements de l'utilisateur
    const events = await supabaseAPI.select('Events', { organizer_id: verification.user_id });

    res.json({
      verification,
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        is_verified_organizer: user.is_verified_organizer,
      } : null,
      eventsCount: events.length,
      events: events.slice(0, 5), // 5 derniers événements
    });
  } catch (err) {
    console.error('Erreur récupération détails vérification:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/verification/admin/requests/:id/approve
 * Approuver une demande de vérification (admin)
 */
router.post('/admin/requests/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  const verificationId = parseInt(req.params.id);
  const adminId = req.user.id;
  const { adminNotes } = req.body;

  try {
    const verifications = await supabaseAPI.select('OrganizerVerifications', { id: verificationId });
    const verification = verifications[0];

    if (!verification) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    if (verification.status === 'approved') {
      return res.status(400).json({ message: 'Demande déjà approuvée' });
    }

    // Mettre à jour la vérification
    await supabaseAPI.update('OrganizerVerifications', {
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes,
      rejection_reason: null,
    }, { id: verificationId });

    // Mettre à jour l'utilisateur
    await supabaseAPI.update('Users', {
      is_verified_organizer: true,
      can_sell_tickets: true,
      verified_at: new Date().toISOString(),
    }, { id: verification.user_id });

    // TODO: Envoyer notification à l'utilisateur

    res.json({
      message: 'Organisateur vérifié avec succès',
      userId: verification.user_id,
    });
  } catch (err) {
    console.error('Erreur approbation vérification:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/verification/admin/requests/:id/reject
 * Rejeter une demande de vérification (admin)
 */
router.post('/admin/requests/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  const verificationId = parseInt(req.params.id);
  const adminId = req.user.id;
  const { rejectionReason, adminNotes } = req.body;

  try {
    if (!rejectionReason) {
      return res.status(400).json({ message: 'Motif de rejet requis' });
    }

    const verifications = await supabaseAPI.select('OrganizerVerifications', { id: verificationId });
    const verification = verifications[0];

    if (!verification) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    // Mettre à jour la vérification
    await supabaseAPI.update('OrganizerVerifications', {
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
      admin_notes: adminNotes,
    }, { id: verificationId });

    // TODO: Envoyer notification à l'utilisateur

    res.json({
      message: 'Demande rejetée',
      userId: verification.user_id,
    });
  } catch (err) {
    console.error('Erreur rejet vérification:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/verification/admin/requests/:id/suspend
 * Suspendre un organisateur vérifié (admin)
 */
router.post('/admin/requests/:id/suspend', authMiddleware, adminMiddleware, async (req, res) => {
  const verificationId = parseInt(req.params.id);
  const adminId = req.user.id;
  const { reason, adminNotes } = req.body;

  try {
    if (!reason) {
      return res.status(400).json({ message: 'Motif de suspension requis' });
    }

    const verifications = await supabaseAPI.select('OrganizerVerifications', { id: verificationId });
    const verification = verifications[0];

    if (!verification) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    // Mettre à jour la vérification
    await supabaseAPI.update('OrganizerVerifications', {
      status: 'suspended',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
      admin_notes: adminNotes,
    }, { id: verificationId });

    // Retirer les droits de l'utilisateur
    await supabaseAPI.update('Users', {
      is_verified_organizer: false,
      can_sell_tickets: false,
    }, { id: verification.user_id });

    // TODO: Envoyer notification à l'utilisateur

    res.json({
      message: 'Organisateur suspendu',
      userId: verification.user_id,
    });
  } catch (err) {
    console.error('Erreur suspension organisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/verification/admin/users/:userId/verify-direct
 * Vérifier directement un utilisateur sans demande (admin)
 */
router.post('/admin/users/:userId/verify-direct', authMiddleware, adminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const adminId = req.user.id;
  const { adminNotes } = req.body;

  try {
    const users = await supabaseAPI.select('Users', { id: userId });
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.is_verified_organizer) {
      return res.status(400).json({ message: 'Utilisateur déjà vérifié' });
    }

    // Créer ou mettre à jour la vérification
    const existing = await supabaseAPI.select('OrganizerVerifications', { user_id: userId });
    
    if (existing.length > 0) {
      await supabaseAPI.update('OrganizerVerifications', {
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || 'Vérification directe par admin',
      }, { user_id: userId });
    } else {
      await supabaseAPI.insert('OrganizerVerifications', {
        user_id: userId,
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || 'Vérification directe par admin',
      });
    }

    // Mettre à jour l'utilisateur
    await supabaseAPI.update('Users', {
      is_verified_organizer: true,
      can_sell_tickets: true,
      verified_at: new Date().toISOString(),
    }, { id: userId });

    res.json({
      message: 'Utilisateur vérifié avec succès',
      userId,
    });
  } catch (err) {
    console.error('Erreur vérification directe:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
