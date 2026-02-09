const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const WonyaSoftService = require('../services/wonyasoft.service');
const PushNotificationService = require('../services/push-notification.service');

console.log('✅ refund.routes chargé');

// =========================
// CONFIGURATION REMBOURSEMENT
// =========================
const REFUND_CONFIG = {
  // Pourcentage remboursé (peut être < 100% pour couvrir les frais)
  REFUND_PERCENT: 100,
  // Statuts de ticket éligibles au remboursement
  ELIGIBLE_STATUSES: ['active', 'refund_pending'],
  // Mode test (pas d'appel WonyaSoft réel)
  TEST_MODE: false,
};

// =========================
// CONDITIONS DE REMBOURSEMENT
// Un remboursement est valide si:
// 1. Le billet est actif
// 2. L'événement a été annulé (event_status = 'cancelled')
// 3. L'organisateur a été suspendu/banni
// =========================
async function checkRefundEligibility(ticket, event, organizer) {
  const reasons = [];
  
  // Condition 1: Billet actif
  if (!REFUND_CONFIG.ELIGIBLE_STATUSES.includes(ticket.status)) {
    return { eligible: false, reason: `Ticket non éligible (statut: ${ticket.status})` };
  }

  // Condition 2: Événement annulé
  if (event.event_status === 'cancelled') {
    reasons.push('Événement annulé');
  }

  // Condition 3: Organisateur suspendu/banni
  if (organizer && (organizer.is_banned || organizer.is_suspended)) {
    reasons.push('Organisateur suspendu');
  }

  // Si aucune condition de remboursement automatique n'est remplie
  if (reasons.length === 0) {
    return { 
      eligible: false, 
      reason: 'Remboursement non disponible. Conditions: événement annulé ou organisateur suspendu.' 
    };
  }

  return { eligible: true, reasons };
}

// =========================
// DEMANDER UN REMBOURSEMENT (Utilisateur)
// =========================
router.post('/request', authMiddleware, async (req, res) => {
  const user = req.user;
  const { ticketId, reason } = req.body;

  try {
    const ticketIdNum = parseInt(ticketId);

    if (isNaN(ticketIdNum) || ticketIdNum <= 0) {
      return res.status(400).json({ message: 'ID ticket invalide' });
    }

    // Récupérer le ticket
    const tickets = await supabaseAPI.select('Tickets', { id: ticketIdNum }, {}, true);
    const ticket = tickets[0];

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (ticket.user_id !== user.id) {
      return res.status(403).json({ message: 'Ce ticket ne vous appartient pas' });
    }

    // Vérifier si un remboursement est déjà en cours
    const existingRefunds = await supabaseAPI.select('Refunds', { 
      ticket_id: ticketIdNum,
      status: { in: ['pending', 'processing', 'approved'] }
    }, {}, true);

    if (existingRefunds && existingRefunds.length > 0) {
      return res.status(400).json({ 
        message: 'Une demande de remboursement est déjà en cours pour ce ticket' 
      });
    }

    // Récupérer l'événement
    const events = await supabaseAPI.select('Events', { id: ticket.event_id }, {}, true);
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Récupérer l'organisateur
    const organizers = await supabaseAPI.select('Users', { id: event.organizer_id }, {}, true);
    const organizer = organizers[0];

    // Vérifier l'éligibilité au remboursement
    const eligibility = await checkRefundEligibility(ticket, event, organizer);
    
    if (!eligibility.eligible) {
      return res.status(400).json({ message: eligibility.reason });
    }

    // Récupérer le paiement original
    const payments = await supabaseAPI.select('Payments', { id: ticket.payment_id }, {}, true);
    const payment = payments[0];

    if (!payment) {
      return res.status(404).json({ message: 'Paiement original non trouvé' });
    }

    // Calculer le montant à rembourser
    const refundAmount = Math.floor(payment.subtotal * REFUND_CONFIG.REFUND_PERCENT / 100);

    // Créer la demande de remboursement
    const refund = await supabaseAPI.insert('Refunds', {
      ticket_id: ticketIdNum,
      payment_id: payment.id,
      user_id: user.id,
      event_id: ticket.event_id,
      amount: refundAmount,
      original_amount: payment.amount,
      currency: payment.currency,
      reason: reason || 'Demande utilisateur',
      status: 'pending',
      mobile_number: payment.mobile_number,
      created_at: new Date().toISOString(),
    }, true);

    // Mettre à jour le statut du ticket
    await supabaseAPI.update('Tickets', {
      status: 'refund_pending',
    }, { id: ticketIdNum }, true);

    // Log d'audit
    try {
      await supabaseAPI.insert('AuditLogs', {
        actor_id: user.id,
        action: 'refund_requested',
        entity_type: 'refund',
        entity_id: refund.id,
        metadata: {
          ticket_id: ticketIdNum,
          amount: refundAmount,
          reason: reason || 'Demande utilisateur',
        },
        ip: req.ip,
        created_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn('Erreur audit log:', logErr?.message);
    }

    res.status(201).json({
      message: 'Demande de remboursement créée',
      refund: {
        id: refund.id,
        amount: refundAmount,
        currency: payment.currency,
        status: 'pending',
        event: event.title,
      },
    });
  } catch (err) {
    console.error('❌ Erreur demande remboursement:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

// =========================
// LISTE DES REMBOURSEMENTS (Utilisateur)
// =========================
router.get('/mine', authMiddleware, async (req, res) => {
  const user = req.user;

  try {
    const refunds = await supabaseAPI.select('Refunds', { user_id: user.id }, { order: 'created_at.desc' }, true);

    // Enrichir avec les détails
    const refundsWithDetails = await Promise.all(
      refunds.map(async (refund) => {
        const [events, tickets] = await Promise.all([
          supabaseAPI.select('Events', { id: refund.event_id }, {}, true),
          supabaseAPI.select('Tickets', { id: refund.ticket_id }, {}, true),
        ]);

        return {
          ...refund,
          event: events[0] || null,
          ticket: tickets[0] || null,
        };
      })
    );

    res.json(refundsWithDetails);
  } catch (err) {
    console.error('❌ Erreur liste remboursements:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// ANNULER UNE DEMANDE DE REMBOURSEMENT (Utilisateur)
// =========================
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  const user = req.user;
  const refundId = parseInt(req.params.id);

  try {
    if (isNaN(refundId) || refundId <= 0) {
      return res.status(400).json({ message: 'ID remboursement invalide' });
    }

    const refunds = await supabaseAPI.select('Refunds', { id: refundId }, {}, true);
    const refund = refunds[0];

    if (!refund) {
      return res.status(404).json({ message: 'Remboursement non trouvé' });
    }

    if (refund.user_id !== user.id) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ message: 'Seules les demandes en attente peuvent être annulées' });
    }

    // Annuler le remboursement
    await supabaseAPI.update('Refunds', {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    }, { id: refundId }, true);

    // Remettre le ticket en actif
    await supabaseAPI.update('Tickets', {
      status: 'active',
    }, { id: refund.ticket_id }, true);

    res.json({ message: 'Demande de remboursement annulée' });
  } catch (err) {
    console.error('❌ Erreur annulation remboursement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// LISTE DES REMBOURSEMENTS À TRAITER (Admin/Modérateur)
// =========================
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const refunds = await supabaseAPI.select('Refunds', { status: 'pending' }, { order: 'created_at.asc' }, true);

    // Enrichir avec les détails
    const refundsWithDetails = await Promise.all(
      refunds.map(async (refund) => {
        const [events, tickets, users] = await Promise.all([
          supabaseAPI.select('Events', { id: refund.event_id }, {}, true),
          supabaseAPI.select('Tickets', { id: refund.ticket_id }, {}, true),
          supabaseAPI.select('Users', { id: refund.user_id }, {}, true),
        ]);

        return {
          ...refund,
          event: events[0] || null,
          ticket: tickets[0] || null,
          user: users[0] ? { id: users[0].id, name: users[0].name, email: users[0].email } : null,
        };
      })
    );

    res.json(refundsWithDetails);
  } catch (err) {
    console.error('❌ Erreur liste remboursements pending:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// APPROUVER UN REMBOURSEMENT (Admin)
// =========================
router.post('/:id/approve', authMiddleware, async (req, res) => {
  const adminUser = req.user;
  const refundId = parseInt(req.params.id);

  try {
    if (!['admin', 'moderator'].includes(adminUser.role)) {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    if (isNaN(refundId) || refundId <= 0) {
      return res.status(400).json({ message: 'ID remboursement invalide' });
    }

    const refunds = await supabaseAPI.select('Refunds', { id: refundId }, {}, true);
    const refund = refunds[0];

    if (!refund) {
      return res.status(404).json({ message: 'Remboursement non trouvé' });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ message: 'Ce remboursement a déjà été traité' });
    }

    // Récupérer le paiement original
    const payments = await supabaseAPI.select('Payments', { id: refund.payment_id }, {}, true);
    const payment = payments[0];

    if (!payment) {
      return res.status(404).json({ message: 'Paiement original non trouvé' });
    }

    // Récupérer l'événement pour la description
    const events = await supabaseAPI.select('Events', { id: refund.event_id }, {}, true);
    const event = events[0];

    let refundTransactionRef = null;

    // MODE TEST ou PRODUCTION
    if (REFUND_CONFIG.TEST_MODE) {
      console.log('🧪 MODE TEST: Remboursement simulé');
      refundTransactionRef = 'TEST_' + WonyaSoftService.generateTransactionRef();
    } else {
      // Initier le remboursement via WonyaSoft
      try {
        const wonyaResult = await WonyaSoftService.createRefund({
          mobileNumber: refund.mobile_number,
          amount: refund.amount,
          currency: refund.currency,
          description: `Remboursement ticket - ${event?.title || 'Événement'}`,
          originalTransactionRef: payment.transaction_ref,
        });
        refundTransactionRef = wonyaResult.transactionRef;
      } catch (wonyaErr) {
        console.error('❌ Erreur WonyaSoft remboursement:', wonyaErr);
        return res.status(500).json({ message: 'Erreur lors du remboursement: ' + wonyaErr.message });
      }
    }

    // Mettre à jour le remboursement
    await supabaseAPI.update('Refunds', {
      status: 'approved',
      approved_by: adminUser.id,
      approved_at: new Date().toISOString(),
      refund_transaction_ref: refundTransactionRef,
    }, { id: refundId }, true);

    // Mettre à jour le ticket
    await supabaseAPI.update('Tickets', {
      status: 'refunded',
    }, { id: refund.ticket_id }, true);

    // Remettre les places disponibles
    const tickets = await supabaseAPI.select('Tickets', { id: refund.ticket_id }, {}, true);
    const ticket = tickets[0];
    if (ticket) {
      const ticketTypes = await supabaseAPI.select('TicketTypes', { id: ticket.ticket_type_id }, {}, true);
      const ticketType = ticketTypes[0];
      if (ticketType) {
        await supabaseAPI.update('TicketTypes', {
          available_quantity: ticketType.available_quantity + (ticket.quantity || 1),
        }, { id: ticketType.id }, true);
      }
    }

    // Notifier l'utilisateur
    try {
      await PushNotificationService.sendToUser(refund.user_id, {
        title: '💰 Remboursement approuvé',
        body: `Votre remboursement de ${refund.amount} ${refund.currency} a été approuvé`,
        data: { type: 'refund_approved', refundId: refund.id },
      });
    } catch (notifErr) {
      console.warn('Erreur notification remboursement:', notifErr?.message);
    }

    // Log d'audit
    try {
      await supabaseAPI.insert('AuditLogs', {
        actor_id: adminUser.id,
        action: 'refund_approved',
        entity_type: 'refund',
        entity_id: refundId,
        metadata: {
          amount: refund.amount,
          user_id: refund.user_id,
          refund_transaction_ref: refundTransactionRef,
        },
        ip: req.ip,
        created_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn('Erreur audit log:', logErr?.message);
    }

    res.json({
      message: 'Remboursement approuvé',
      refund: {
        id: refundId,
        amount: refund.amount,
        currency: refund.currency,
        status: 'approved',
        refundTransactionRef,
      },
    });
  } catch (err) {
    console.error('❌ Erreur approbation remboursement:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

// =========================
// REJETER UN REMBOURSEMENT (Admin)
// =========================
router.post('/:id/reject', authMiddleware, async (req, res) => {
  const adminUser = req.user;
  const refundId = parseInt(req.params.id);
  const { rejectionReason } = req.body;

  try {
    if (!['admin', 'moderator'].includes(adminUser.role)) {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    if (isNaN(refundId) || refundId <= 0) {
      return res.status(400).json({ message: 'ID remboursement invalide' });
    }

    const refunds = await supabaseAPI.select('Refunds', { id: refundId }, {}, true);
    const refund = refunds[0];

    if (!refund) {
      return res.status(404).json({ message: 'Remboursement non trouvé' });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ message: 'Ce remboursement a déjà été traité' });
    }

    // Mettre à jour le remboursement
    await supabaseAPI.update('Refunds', {
      status: 'rejected',
      rejected_by: adminUser.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: rejectionReason || 'Non spécifié',
    }, { id: refundId }, true);

    // Remettre le ticket en actif
    await supabaseAPI.update('Tickets', {
      status: 'active',
    }, { id: refund.ticket_id }, true);

    // Notifier l'utilisateur
    try {
      await PushNotificationService.sendToUser(refund.user_id, {
        title: '❌ Remboursement refusé',
        body: rejectionReason || 'Votre demande de remboursement a été refusée',
        data: { type: 'refund_rejected', refundId: refund.id },
      });
    } catch (notifErr) {
      console.warn('Erreur notification remboursement:', notifErr?.message);
    }

    // Log d'audit
    try {
      await supabaseAPI.insert('AuditLogs', {
        actor_id: adminUser.id,
        action: 'refund_rejected',
        entity_type: 'refund',
        entity_id: refundId,
        metadata: {
          user_id: refund.user_id,
          rejection_reason: rejectionReason,
        },
        ip: req.ip,
        created_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn('Erreur audit log:', logErr?.message);
    }

    res.json({ message: 'Remboursement rejeté' });
  } catch (err) {
    console.error('❌ Erreur rejet remboursement:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

// =========================
// STATISTIQUES REMBOURSEMENTS (Admin)
// =========================
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const allRefunds = await supabaseAPI.select('Refunds', {}, {}, true);

    const stats = {
      total: allRefunds.length,
      pending: allRefunds.filter(r => r.status === 'pending').length,
      approved: allRefunds.filter(r => r.status === 'approved').length,
      rejected: allRefunds.filter(r => r.status === 'rejected').length,
      cancelled: allRefunds.filter(r => r.status === 'cancelled').length,
      totalAmountRefunded: allRefunds
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + (r.amount || 0), 0),
      byCurrency: {},
    };

    // Grouper par devise
    allRefunds.filter(r => r.status === 'approved').forEach(r => {
      const currency = r.currency || 'CDF';
      if (!stats.byCurrency[currency]) {
        stats.byCurrency[currency] = { count: 0, amount: 0 };
      }
      stats.byCurrency[currency].count++;
      stats.byCurrency[currency].amount += r.amount || 0;
    });

    res.json(stats);
  } catch (err) {
    console.error('❌ Erreur stats remboursements:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
