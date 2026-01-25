const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const { adminMiddleware, moderatorMiddleware } = require('../middlewares/role.middleware');
const similarityService = require('../services/similarity-detection.service');

console.log('✅ moderation.routes chargé');

// =============================================
// ROUTES MODÉRATION ÉVÉNEMENTS
// =============================================

/**
 * GET /api/moderation/events
 * Liste les événements en attente de modération
 */
router.get('/events', authMiddleware, moderatorMiddleware, async (req, res) => {
  const { status = 'pending_review', page = 1, limit = 20 } = req.query;

  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Construire le filtre
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Récupérer les événements
    const events = await supabaseAPI.select(
      'Events',
      filter,
      { limit: parseInt(limit), offset, order: 'submitted_at.desc.nullsfirst,created_at.desc' }
    );

    // Récupérer les organisateurs
    const organizerIds = [...new Set(events.map(e => e.organizer_id))];
    const organizers = organizerIds.length > 0 
      ? await supabaseAPI.select('Users', {}, { limit: 1000 })
      : [];
    
    const organizersMap = new Map(organizers.map(u => [u.id, u]));

    // Enrichir les données
    const enriched = events.map(e => ({
      ...e,
      organizer: organizersMap.get(e.organizer_id) ? {
        id: organizersMap.get(e.organizer_id).id,
        name: organizersMap.get(e.organizer_id).name,
        email: organizersMap.get(e.organizer_id).email,
        avatar_url: organizersMap.get(e.organizer_id).avatar_url,
        is_verified_organizer: organizersMap.get(e.organizer_id).is_verified_organizer,
      } : null,
    }));

    // Compter par statut
    const allEvents = await supabaseAPI.select('Events', {}, { limit: 10000 });
    const stats = {
      draft: allEvents.filter(e => e.status === 'draft').length,
      pending_review: allEvents.filter(e => e.status === 'pending_review').length,
      published: allEvents.filter(e => e.status === 'published').length,
      rejected: allEvents.filter(e => e.status === 'rejected').length,
      suspended: allEvents.filter(e => e.status === 'suspended').length,
      total: allEvents.length,
    };

    res.json({
      events: enriched,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: stats[status] || stats.total,
      },
    });
  } catch (err) {
    console.error('Erreur récupération événements modération:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/moderation/events/:id
 * Détails d'un événement pour modération
 */
router.get('/events/:id', authMiddleware, moderatorMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id);

  try {
    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Récupérer l'organisateur
    const organizers = await supabaseAPI.select('Users', { id: event.organizer_id });
    const organizer = organizers[0];

    // Récupérer la vérification de l'organisateur
    const verifications = await supabaseAPI.select('OrganizerVerifications', { user_id: event.organizer_id });
    const verification = verifications[0];

    // Récupérer l'historique des reviews
    const reviews = await supabaseAPI.select('EventReviews', { event_id: eventId }, { order: 'created_at.desc' });

    // Récupérer les flags de similarité
    let similarityFlags = [];
    try {
      similarityFlags = await supabaseAPI.select('EventSimilarityFlags', { event_id: eventId });
    } catch (e) {
      // Table peut ne pas exister encore
    }

    // Récupérer les autres événements de l'organisateur
    const organizerEvents = await supabaseAPI.select('Events', { organizer_id: event.organizer_id }, { limit: 10 });

    res.json({
      event,
      organizer: organizer ? {
        id: organizer.id,
        name: organizer.name,
        email: organizer.email,
        avatar_url: organizer.avatar_url,
        is_verified_organizer: organizer.is_verified_organizer,
        created_at: organizer.created_at,
      } : null,
      verification: verification ? {
        status: verification.status,
        business_type: verification.business_type,
        reviewed_at: verification.reviewed_at,
      } : null,
      reviews,
      similarityFlags,
      organizerEventsCount: organizerEvents.length,
      organizerEvents: organizerEvents.filter(e => e.id !== eventId).slice(0, 5),
    });
  } catch (err) {
    console.error('Erreur récupération détails événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/moderation/events/:id/approve
 * Approuver un événement (le publier)
 */
router.post('/events/:id/approve', authMiddleware, moderatorMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id);
  const reviewerId = req.user.id;
  const { adminNotes } = req.body;

  try {
    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.status === 'published') {
      return res.status(400).json({ message: 'Événement déjà publié' });
    }

    const previousStatus = event.status;

    // Mettre à jour l'événement
    await supabaseAPI.update('Events', {
      status: 'published',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    }, { id: eventId });

    // Créer une entrée dans l'historique
    await supabaseAPI.insert('EventReviews', {
      event_id: eventId,
      reviewer_id: reviewerId,
      action: 'approved',
      admin_notes: adminNotes,
      previous_status: previousStatus,
      new_status: 'published',
    });

    // TODO: Notifier l'organisateur

    res.json({
      message: 'Événement approuvé et publié',
      eventId,
    });
  } catch (err) {
    console.error('Erreur approbation événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/moderation/events/:id/reject
 * Rejeter un événement
 */
router.post('/events/:id/reject', authMiddleware, moderatorMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id);
  const reviewerId = req.user.id;
  const { reason, adminNotes } = req.body;

  try {
    if (!reason) {
      return res.status(400).json({ message: 'Motif de rejet requis' });
    }

    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    const previousStatus = event.status;

    // Mettre à jour l'événement
    await supabaseAPI.update('Events', {
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    }, { id: eventId });

    // Créer une entrée dans l'historique
    await supabaseAPI.insert('EventReviews', {
      event_id: eventId,
      reviewer_id: reviewerId,
      action: 'rejected',
      reason,
      admin_notes: adminNotes,
      previous_status: previousStatus,
      new_status: 'rejected',
    });

    // TODO: Notifier l'organisateur

    res.json({
      message: 'Événement rejeté',
      eventId,
    });
  } catch (err) {
    console.error('Erreur rejet événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/moderation/events/:id/suspend
 * Suspendre un événement publié
 */
router.post('/events/:id/suspend', authMiddleware, adminMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id);
  const reviewerId = req.user.id;
  const { reason, adminNotes } = req.body;

  try {
    if (!reason) {
      return res.status(400).json({ message: 'Motif de suspension requis' });
    }

    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    const previousStatus = event.status;

    // Mettre à jour l'événement
    await supabaseAPI.update('Events', {
      status: 'suspended',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    }, { id: eventId });

    // Créer une entrée dans l'historique
    await supabaseAPI.insert('EventReviews', {
      event_id: eventId,
      reviewer_id: reviewerId,
      action: 'suspended',
      reason,
      admin_notes: adminNotes,
      previous_status: previousStatus,
      new_status: 'suspended',
    });

    // TODO: Notifier l'organisateur et les acheteurs

    res.json({
      message: 'Événement suspendu',
      eventId,
    });
  } catch (err) {
    console.error('Erreur suspension événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/moderation/events/:id/restore
 * Restaurer un événement suspendu
 */
router.post('/events/:id/restore', authMiddleware, adminMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id);
  const reviewerId = req.user.id;
  const { adminNotes } = req.body;

  try {
    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.status !== 'suspended') {
      return res.status(400).json({ message: 'Seuls les événements suspendus peuvent être restaurés' });
    }

    const previousStatus = event.status;

    // Mettre à jour l'événement
    await supabaseAPI.update('Events', {
      status: 'published',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    }, { id: eventId });

    // Créer une entrée dans l'historique
    await supabaseAPI.insert('EventReviews', {
      event_id: eventId,
      reviewer_id: reviewerId,
      action: 'restored',
      admin_notes: adminNotes,
      previous_status: previousStatus,
      new_status: 'published',
    });

    res.json({
      message: 'Événement restauré',
      eventId,
    });
  } catch (err) {
    console.error('Erreur restauration événement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/moderation/events/:id/flag
 * Ajouter un flag à un événement
 */
router.post('/events/:id/flag', authMiddleware, moderatorMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id);
  const reviewerId = req.user.id;
  const { flagType, reason, adminNotes } = req.body;

  try {
    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Ajouter le flag aux moderation_flags
    const currentFlags = event.moderation_flags || [];
    const newFlag = {
      type: flagType,
      reason,
      flagged_by: reviewerId,
      flagged_at: new Date().toISOString(),
    };

    await supabaseAPI.update('Events', {
      moderation_flags: [...currentFlags, newFlag],
    }, { id: eventId });

    // Créer une entrée dans l'historique
    await supabaseAPI.insert('EventReviews', {
      event_id: eventId,
      reviewer_id: reviewerId,
      action: 'flagged',
      reason,
      flags: { [flagType]: true },
      admin_notes: adminNotes,
      previous_status: event.status,
      new_status: event.status,
    });

    res.json({
      message: 'Flag ajouté',
      eventId,
      flag: newFlag,
    });
  } catch (err) {
    console.error('Erreur ajout flag:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/moderation/events/:id/similarity
 * Analyse la similarité d'un événement avec les autres
 */
router.get('/events/:id/similarity', authMiddleware, moderatorMiddleware, async (req, res) => {
  const eventId = parseInt(req.params.id);

  try {
    const events = await supabaseAPI.select('Events', { id: eventId });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Récupérer tous les événements publiés pour comparaison
    const allEvents = await supabaseAPI.select('Events', { status: 'published' }, { limit: 500 });

    // Analyser les similarités
    const analysis = await similarityService.checkForDuplicates(event, allEvents);

    res.json({
      eventId,
      ...analysis,
    });
  } catch (err) {
    console.error('Erreur analyse similarité:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/moderation/organizers/:id/patterns
 * Analyse les patterns suspects d'un organisateur
 */
router.get('/organizers/:id/patterns', authMiddleware, moderatorMiddleware, async (req, res) => {
  const organizerId = parseInt(req.params.id);

  try {
    // Récupérer les événements de l'organisateur
    const organizerEvents = await supabaseAPI.select('Events', { organizer_id: organizerId }, { limit: 100 });

    if (organizerEvents.length === 0) {
      return res.json({
        organizerId,
        eventsCount: 0,
        patterns: { suspiciousPatterns: [], riskLevel: 'low' },
      });
    }

    // Récupérer tous les événements pour comparaison
    const allEvents = await supabaseAPI.select('Events', {}, { limit: 1000 });

    // Analyser les patterns
    const patterns = similarityService.analyzeOrganizerPatterns(organizerId, organizerEvents, allEvents);

    // Récupérer les infos de l'organisateur
    const users = await supabaseAPI.select('Users', { id: organizerId });
    const organizer = users[0];

    res.json({
      organizerId,
      organizer: organizer ? {
        name: organizer.name,
        email: organizer.email,
        is_verified_organizer: organizer.is_verified_organizer,
        created_at: organizer.created_at,
      } : null,
      eventsCount: organizerEvents.length,
      patterns,
    });
  } catch (err) {
    console.error('Erreur analyse patterns organisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/moderation/check-similarity
 * Vérifie la similarité d'un événement avant publication
 */
router.post('/check-similarity', authMiddleware, async (req, res) => {
  const { title, location, startDate, images } = req.body;

  try {
    if (!title) {
      return res.status(400).json({ message: 'Titre requis' });
    }

    // Créer un objet événement temporaire
    const tempEvent = {
      id: 0,
      title,
      location,
      start_date: startDate,
      images: images || [],
      organizer_id: req.user.id,
    };

    // Récupérer les événements publiés récents
    const recentEvents = await supabaseAPI.select(
      'Events',
      { status: 'published' },
      { limit: 200, order: 'created_at.desc' }
    );

    // Analyser les similarités
    const analysis = await similarityService.checkForDuplicates(tempEvent, recentEvents);

    res.json({
      ...analysis,
      recommendation: analysis.hasPotentialDuplicates
        ? 'Attention: Cet événement ressemble à des événements existants. Vérifiez qu\'il ne s\'agit pas d\'un doublon.'
        : 'Aucun doublon détecté.',
    });
  } catch (err) {
    console.error('Erreur vérification similarité:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
