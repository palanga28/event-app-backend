const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const PushNotificationService = require('../services/push-notification.service');

console.log('✅ event-request.routes chargé');

// =========================
// DEMANDER UN REPORT D'ÉVÉNEMENT (Organisateur)
// =========================
router.post('/postpone', authMiddleware, async (req, res) => {
  const user = req.user;
  const { eventId, reason, newStartDate, newEndDate } = req.body;

  try {
    const eventIdNum = parseInt(eventId);

    if (isNaN(eventIdNum) || eventIdNum <= 0) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ message: 'Veuillez fournir une raison détaillée (min 10 caractères)' });
    }

    if (!newStartDate) {
      return res.status(400).json({ message: 'Veuillez fournir la nouvelle date de début' });
    }

    // Vérifier que l'événement existe et appartient à l'utilisateur
    const events = await supabaseAPI.select('Events', { id: eventIdNum }, {}, true);
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.organizer_id !== user.id) {
      return res.status(403).json({ message: 'Vous n\'êtes pas l\'organisateur de cet événement' });
    }

    // Vérifier que l'événement n'est pas déjà annulé
    if (event.event_status === 'cancelled') {
      return res.status(400).json({ message: 'Cet événement est déjà annulé' });
    }

    // Vérifier qu'il n'y a pas déjà une demande en cours
    const existingRequests = await supabaseAPI.select('EventRequests', {
      event_id: eventIdNum,
      status: 'pending'
    }, {}, true);

    if (existingRequests && existingRequests.length > 0) {
      return res.status(400).json({ message: 'Une demande est déjà en cours pour cet événement' });
    }

    // Créer la demande de report
    const request = await supabaseAPI.insert('EventRequests', {
      event_id: eventIdNum,
      organizer_id: user.id,
      request_type: 'postpone',
      reason: reason.trim(),
      new_start_date: newStartDate,
      new_end_date: newEndDate || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    }, true);

    // Notifier les modérateurs
    try {
      const moderators = await supabaseAPI.select('Users', { role: 'moderator' }, {}, true);
      const admins = await supabaseAPI.select('Users', { role: 'admin' }, {}, true);
      const reviewers = [...moderators, ...admins];

      for (const reviewer of reviewers) {
        await PushNotificationService.sendToUser(reviewer.id, {
          title: '📅 Demande de report',
          body: `${user.name} demande à reporter "${event.title}"`,
          data: { type: 'event_postpone_request', requestId: request.id, eventId: eventIdNum },
        });
      }
    } catch (notifErr) {
      console.warn('Erreur notification modérateurs:', notifErr?.message);
    }

    // Log d'audit
    try {
      await supabaseAPI.insert('AuditLogs', {
        actor_id: user.id,
        action: 'event_postpone_requested',
        entity_type: 'event_request',
        entity_id: request.id,
        metadata: { event_id: eventIdNum, reason, new_start_date: newStartDate },
        ip: req.ip,
        created_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn('Erreur audit log:', logErr?.message);
    }

    res.status(201).json({
      message: 'Demande de report soumise, en attente d\'approbation',
      request: {
        id: request.id,
        event_id: eventIdNum,
        request_type: 'postpone',
        status: 'pending',
        new_start_date: newStartDate,
      },
    });
  } catch (err) {
    console.error('❌ Erreur demande report:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

// =========================
// DEMANDER UNE ANNULATION D'ÉVÉNEMENT (Organisateur)
// =========================
router.post('/cancel', authMiddleware, async (req, res) => {
  const user = req.user;
  const { eventId, reason } = req.body;

  try {
    const eventIdNum = parseInt(eventId);

    if (isNaN(eventIdNum) || eventIdNum <= 0) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ message: 'Veuillez fournir une raison détaillée (min 10 caractères)' });
    }

    // Vérifier que l'événement existe et appartient à l'utilisateur
    const events = await supabaseAPI.select('Events', { id: eventIdNum }, {}, true);
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.organizer_id !== user.id) {
      return res.status(403).json({ message: 'Vous n\'êtes pas l\'organisateur de cet événement' });
    }

    // Vérifier que l'événement n'est pas déjà annulé
    if (event.event_status === 'cancelled') {
      return res.status(400).json({ message: 'Cet événement est déjà annulé' });
    }

    // Vérifier qu'il n'y a pas déjà une demande en cours
    const existingRequests = await supabaseAPI.select('EventRequests', {
      event_id: eventIdNum,
      status: 'pending'
    }, {}, true);

    if (existingRequests && existingRequests.length > 0) {
      return res.status(400).json({ message: 'Une demande est déjà en cours pour cet événement' });
    }

    // Créer la demande d'annulation
    const request = await supabaseAPI.insert('EventRequests', {
      event_id: eventIdNum,
      organizer_id: user.id,
      request_type: 'cancel',
      reason: reason.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    }, true);

    // Notifier les modérateurs
    try {
      const moderators = await supabaseAPI.select('Users', { role: 'moderator' }, {}, true);
      const admins = await supabaseAPI.select('Users', { role: 'admin' }, {}, true);
      const reviewers = [...moderators, ...admins];

      for (const reviewer of reviewers) {
        await PushNotificationService.sendToUser(reviewer.id, {
          title: '🚫 Demande d\'annulation',
          body: `${user.name} demande à annuler "${event.title}"`,
          data: { type: 'event_cancel_request', requestId: request.id, eventId: eventIdNum },
        });
      }
    } catch (notifErr) {
      console.warn('Erreur notification modérateurs:', notifErr?.message);
    }

    // Log d'audit
    try {
      await supabaseAPI.insert('AuditLogs', {
        actor_id: user.id,
        action: 'event_cancel_requested',
        entity_type: 'event_request',
        entity_id: request.id,
        metadata: { event_id: eventIdNum, reason },
        ip: req.ip,
        created_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn('Erreur audit log:', logErr?.message);
    }

    res.status(201).json({
      message: 'Demande d\'annulation soumise, en attente d\'approbation',
      request: {
        id: request.id,
        event_id: eventIdNum,
        request_type: 'cancel',
        status: 'pending',
      },
    });
  } catch (err) {
    console.error('❌ Erreur demande annulation:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

// =========================
// MES DEMANDES (Organisateur)
// =========================
router.get('/mine', authMiddleware, async (req, res) => {
  const user = req.user;

  try {
    const requests = await supabaseAPI.select('EventRequests', 
      { organizer_id: user.id }, 
      { order: 'created_at.desc' }, 
      true
    );

    // Enrichir avec les détails des événements
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const events = await supabaseAPI.select('Events', { id: request.event_id }, {}, true);
        return {
          ...request,
          event: events[0] || null,
        };
      })
    );

    res.json(requestsWithDetails);
  } catch (err) {
    console.error('❌ Erreur liste demandes:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// LISTE DES DEMANDES EN ATTENTE (Modérateur/Admin)
// =========================
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès réservé aux modérateurs' });
    }

    const requests = await supabaseAPI.select('EventRequests', 
      { status: 'pending' }, 
      { order: 'created_at.asc' }, 
      true
    );

    // Enrichir avec les détails
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const [events, organizers] = await Promise.all([
          supabaseAPI.select('Events', { id: request.event_id }, {}, true),
          supabaseAPI.select('Users', { id: request.organizer_id }, {}, true),
        ]);

        // Compter les tickets vendus
        const tickets = await supabaseAPI.select('Tickets', { event_id: request.event_id }, {}, true);
        const activeTickets = tickets.filter(t => t.status === 'active').length;

        return {
          ...request,
          event: events[0] || null,
          organizer: organizers[0] ? { 
            id: organizers[0].id, 
            name: organizers[0].name, 
            email: organizers[0].email 
          } : null,
          tickets_sold: activeTickets,
        };
      })
    );

    res.json(requestsWithDetails);
  } catch (err) {
    console.error('❌ Erreur liste demandes pending:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// APPROUVER UNE DEMANDE (Modérateur/Admin)
// =========================
router.post('/:id/approve', authMiddleware, async (req, res) => {
  const reviewer = req.user;
  const requestId = parseInt(req.params.id);
  const { comment } = req.body;

  try {
    if (!['admin', 'moderator'].includes(reviewer.role)) {
      return res.status(403).json({ message: 'Accès réservé aux modérateurs' });
    }

    if (isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'ID demande invalide' });
    }

    const requests = await supabaseAPI.select('EventRequests', { id: requestId }, {}, true);
    const request = requests[0];

    if (!request) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Cette demande a déjà été traitée' });
    }

    // Récupérer l'événement
    const events = await supabaseAPI.select('Events', { id: request.event_id }, {}, true);
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Mettre à jour la demande
    await supabaseAPI.update('EventRequests', {
      status: 'approved',
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
      review_comment: comment || null,
    }, { id: requestId }, true);

    // Appliquer les changements selon le type de demande
    if (request.request_type === 'cancel') {
      // Annuler l'événement
      await supabaseAPI.update('Events', {
        event_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      }, { id: request.event_id }, true);

      // Récupérer tous les tickets actifs pour cet événement
      const tickets = await supabaseAPI.select('Tickets', { 
        event_id: request.event_id, 
        status: 'active' 
      }, {}, true);

      // Créer automatiquement des demandes de remboursement pour tous les tickets
      for (const ticket of tickets) {
        try {
          // Récupérer le paiement
          const payments = await supabaseAPI.select('Payments', { id: ticket.payment_id }, {}, true);
          const payment = payments[0];

          if (payment) {
            // Créer la demande de remboursement automatique
            await supabaseAPI.insert('Refunds', {
              ticket_id: ticket.id,
              payment_id: payment.id,
              user_id: ticket.user_id,
              event_id: request.event_id,
              amount: payment.subtotal,
              original_amount: payment.amount,
              currency: payment.currency,
              reason: `Événement annulé: ${request.reason}`,
              status: 'pending',
              mobile_number: payment.mobile_number,
              created_at: new Date().toISOString(),
            }, true);

            // Mettre à jour le statut du ticket
            await supabaseAPI.update('Tickets', {
              status: 'refund_pending',
            }, { id: ticket.id }, true);

            // Notifier l'utilisateur
            await PushNotificationService.sendToUser(ticket.user_id, {
              title: '🚫 Événement annulé',
              body: `"${event.title}" a été annulé. Un remboursement est en cours.`,
              data: { type: 'event_cancelled', eventId: request.event_id },
            });
          }
        } catch (ticketErr) {
          console.warn('Erreur traitement ticket:', ticketErr?.message);
        }
      }

    } else if (request.request_type === 'postpone') {
      // Reporter l'événement
      await supabaseAPI.update('Events', {
        event_status: 'postponed',
        postponed_from: event.start_date,
        start_date: request.new_start_date,
        end_date: request.new_end_date || event.end_date,
      }, { id: request.event_id }, true);

      // Notifier tous les détenteurs de tickets
      const tickets = await supabaseAPI.select('Tickets', { 
        event_id: request.event_id, 
        status: 'active' 
      }, {}, true);

      const newDate = new Date(request.new_start_date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      for (const ticket of tickets) {
        try {
          await PushNotificationService.sendToUser(ticket.user_id, {
            title: '📅 Événement reporté',
            body: `"${event.title}" a été reporté au ${newDate}`,
            data: { type: 'event_postponed', eventId: request.event_id },
          });
        } catch (notifErr) {
          console.warn('Erreur notification ticket holder:', notifErr?.message);
        }
      }
    }

    // Notifier l'organisateur
    try {
      await PushNotificationService.sendToUser(request.organizer_id, {
        title: request.request_type === 'cancel' ? '✅ Annulation approuvée' : '✅ Report approuvé',
        body: `Votre demande pour "${event.title}" a été approuvée`,
        data: { type: 'event_request_approved', requestId, eventId: request.event_id },
      });
    } catch (notifErr) {
      console.warn('Erreur notification organisateur:', notifErr?.message);
    }

    // Log d'audit
    try {
      await supabaseAPI.insert('AuditLogs', {
        actor_id: reviewer.id,
        action: `event_${request.request_type}_approved`,
        entity_type: 'event_request',
        entity_id: requestId,
        metadata: { event_id: request.event_id, comment },
        ip: req.ip,
        created_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn('Erreur audit log:', logErr?.message);
    }

    res.json({
      message: request.request_type === 'cancel' 
        ? 'Annulation approuvée, remboursements en cours' 
        : 'Report approuvé, utilisateurs notifiés',
    });
  } catch (err) {
    console.error('❌ Erreur approbation demande:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

// =========================
// REJETER UNE DEMANDE (Modérateur/Admin)
// =========================
router.post('/:id/reject', authMiddleware, async (req, res) => {
  const reviewer = req.user;
  const requestId = parseInt(req.params.id);
  const { comment } = req.body;

  try {
    if (!['admin', 'moderator'].includes(reviewer.role)) {
      return res.status(403).json({ message: 'Accès réservé aux modérateurs' });
    }

    if (isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'ID demande invalide' });
    }

    if (!comment || comment.trim().length < 5) {
      return res.status(400).json({ message: 'Veuillez fournir une raison de rejet' });
    }

    const requests = await supabaseAPI.select('EventRequests', { id: requestId }, {}, true);
    const request = requests[0];

    if (!request) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Cette demande a déjà été traitée' });
    }

    // Récupérer l'événement
    const events = await supabaseAPI.select('Events', { id: request.event_id }, {}, true);
    const event = events[0];

    // Mettre à jour la demande
    await supabaseAPI.update('EventRequests', {
      status: 'rejected',
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
      review_comment: comment.trim(),
    }, { id: requestId }, true);

    // Notifier l'organisateur
    try {
      await PushNotificationService.sendToUser(request.organizer_id, {
        title: request.request_type === 'cancel' ? '❌ Annulation refusée' : '❌ Report refusé',
        body: comment.trim(),
        data: { type: 'event_request_rejected', requestId, eventId: request.event_id },
      });
    } catch (notifErr) {
      console.warn('Erreur notification organisateur:', notifErr?.message);
    }

    // Log d'audit
    try {
      await supabaseAPI.insert('AuditLogs', {
        actor_id: reviewer.id,
        action: `event_${request.request_type}_rejected`,
        entity_type: 'event_request',
        entity_id: requestId,
        metadata: { event_id: request.event_id, comment },
        ip: req.ip,
        created_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn('Erreur audit log:', logErr?.message);
    }

    res.json({ message: 'Demande rejetée' });
  } catch (err) {
    console.error('❌ Erreur rejet demande:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
