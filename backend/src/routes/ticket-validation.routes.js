const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const ticketSignatureService = require('../services/ticket-signature.service');

console.log('✅ ticket-validation.routes chargé');

/**
 * POST /api/tickets/validate
 * Valide un ticket scanné (QR code)
 */
router.post('/validate', authMiddleware, async (req, res) => {
  const scannerId = req.user.id;
  const { qrCode, eventId, deviceId, deviceInfo, location } = req.body;

  try {
    if (!qrCode) {
      return res.status(400).json({ 
        valid: false, 
        error: 'QR code requis',
        result: 'invalid_request'
      });
    }

    // Rechercher le ticket par QR code
    const tickets = await supabaseAPI.select('Tickets', { qr_code: qrCode });
    const ticket = tickets[0];

    if (!ticket) {
      // Logger le scan échoué
      await logScan({
        ticketId: null,
        eventId: eventId || null,
        scannedBy: scannerId,
        result: 'not_found',
        deviceId,
        deviceInfo,
        location,
      });

      return res.status(404).json({
        valid: false,
        error: 'Ticket non trouvé',
        result: 'not_found'
      });
    }

    // Vérifier que le ticket correspond à l'événement (si spécifié)
    if (eventId && ticket.event_id !== parseInt(eventId)) {
      await logScan({
        ticketId: ticket.id,
        eventId: eventId,
        scannedBy: scannerId,
        result: 'invalid_event',
        deviceId,
        deviceInfo,
        location,
      });

      return res.status(400).json({
        valid: false,
        error: 'Ce ticket n\'est pas pour cet événement',
        result: 'invalid_event'
      });
    }

    // Récupérer les scans récents pour analyse
    let recentScans = [];
    try {
      recentScans = await supabaseAPI.select(
        'TicketScans',
        { ticket_id: ticket.id },
        { limit: 10, order: 'created_at.desc' }
      );
    } catch (e) {
      // Table peut ne pas exister
    }

    // Valider la signature et l'intégrité
    const validation = ticketSignatureService.validateTicket(ticket);

    // Détecter les scans suspects
    const suspicionAnalysis = ticketSignatureService.detectSuspiciousScan(
      ticket,
      { deviceId, location },
      recentScans
    );

    // Déterminer le résultat final
    let scanResult = 'valid';
    let responseValid = true;
    let errorMessage = null;

    if (!validation.valid) {
      if (validation.errors.includes('invalid_signature')) {
        scanResult = 'invalid_signature';
        responseValid = false;
        errorMessage = 'Signature du ticket invalide - possible falsification';
      } else if (validation.errors.includes('already_used')) {
        scanResult = 'already_used';
        responseValid = false;
        errorMessage = 'Ce ticket a déjà été utilisé';
      } else if (validation.errors.includes('cancelled')) {
        scanResult = 'invalid_signature';
        responseValid = false;
        errorMessage = 'Ce ticket a été annulé';
      }
    }

    // Si suspect mais valide, marquer comme suspicious
    if (responseValid && suspicionAnalysis.suspicious) {
      if (suspicionAnalysis.severity === 'high') {
        scanResult = 'suspicious';
        // On laisse passer mais on alerte
      }
    }

    // Logger le scan
    await logScan({
      ticketId: ticket.id,
      eventId: ticket.event_id,
      scannedBy: scannerId,
      result: scanResult,
      deviceId,
      deviceInfo,
      location,
      isSuspicious: suspicionAnalysis.suspicious,
      suspiciousReason: suspicionAnalysis.reasons.join(', '),
    });

    // Mettre à jour le ticket
    if (responseValid && scanResult === 'valid') {
      await supabaseAPI.update('Tickets', {
        status: 'used',
        scan_count: (ticket.scan_count || 0) + 1,
        last_scanned_at: new Date().toISOString(),
        last_scan_device_id: deviceId,
        updated_at: new Date().toISOString(),
      }, { id: ticket.id });
    } else {
      // Juste incrémenter le compteur de scan
      await supabaseAPI.update('Tickets', {
        scan_count: (ticket.scan_count || 0) + 1,
        last_scanned_at: new Date().toISOString(),
        last_scan_device_id: deviceId,
      }, { id: ticket.id });
    }

    // Créer une alerte si très suspect
    if (suspicionAnalysis.suspicious && suspicionAnalysis.severity === 'high') {
      await createSecurityAlert({
        ticketId: ticket.id,
        eventId: ticket.event_id,
        alertType: suspicionAnalysis.reasons[0] || 'suspicious_pattern',
        severity: suspicionAnalysis.severity,
        description: `Scan suspect détecté: ${suspicionAnalysis.reasons.join(', ')}`,
        metadata: {
          deviceId,
          location,
          scanCount: ticket.scan_count,
          reasons: suspicionAnalysis.reasons,
        },
      });
    }

    // Récupérer les infos complètes pour la réponse
    const users = await supabaseAPI.select('Users', { id: ticket.user_id });
    const events = await supabaseAPI.select('Events', { id: ticket.event_id });
    const ticketTypes = ticket.ticket_type_id 
      ? await supabaseAPI.select('TicketTypes', { id: ticket.ticket_type_id })
      : [];

    const response = {
      valid: responseValid,
      result: scanResult,
      ticket: {
        id: ticket.id,
        qr_code: ticket.qr_code,
        status: responseValid ? 'used' : ticket.status,
        price: ticket.price,
        created_at: ticket.created_at,
      },
      user: users[0] ? {
        id: users[0].id,
        name: users[0].name,
        email: users[0].email,
        avatar_url: users[0].avatar_url,
      } : null,
      event: events[0] ? {
        id: events[0].id,
        title: events[0].title,
        start_date: events[0].start_date,
      } : null,
      ticketType: ticketTypes[0] ? {
        id: ticketTypes[0].id,
        name: ticketTypes[0].name,
      } : null,
    };

    if (!responseValid) {
      response.error = errorMessage;
    }

    if (suspicionAnalysis.suspicious) {
      response.warning = {
        suspicious: true,
        reasons: suspicionAnalysis.reasons,
        severity: suspicionAnalysis.severity,
      };
    }

    res.json(response);
  } catch (err) {
    console.error('Erreur validation ticket:', err);
    res.status(500).json({ 
      valid: false, 
      error: 'Erreur serveur',
      result: 'error'
    });
  }
});

/**
 * GET /api/tickets/:id/security
 * Récupère les infos de sécurité d'un ticket (pour debug/admin)
 */
router.get('/:id/security', authMiddleware, async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    const tickets = await supabaseAPI.select('Tickets', { id: ticketId });
    const ticket = tickets[0];

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    // Vérifier que l'utilisateur est propriétaire ou admin
    const users = await supabaseAPI.select('Users', { id: userId });
    const user = users[0];

    if (ticket.user_id !== userId && user?.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Récupérer l'historique des scans
    let scans = [];
    try {
      scans = await supabaseAPI.select(
        'TicketScans',
        { ticket_id: ticketId },
        { limit: 20, order: 'created_at.desc' }
      );
    } catch (e) {
      // Table peut ne pas exister
    }

    // Valider le ticket
    const validation = ticketSignatureService.validateTicket(ticket);

    res.json({
      ticket: {
        id: ticket.id,
        status: ticket.status,
        signature: ticket.signature ? '***' + ticket.signature.slice(-8) : null,
        signature_version: ticket.signature_version,
        content_hash: ticket.content_hash,
        scan_count: ticket.scan_count || 0,
        last_scanned_at: ticket.last_scanned_at,
      },
      validation,
      scans: scans.map(s => ({
        id: s.id,
        result: s.scan_result,
        is_suspicious: s.is_suspicious,
        created_at: s.created_at,
      })),
    });
  } catch (err) {
    console.error('Erreur récupération sécurité ticket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/tickets/:id/sign
 * Signe un ticket existant (migration/admin)
 */
router.post('/:id/sign', authMiddleware, async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    // Vérifier que l'utilisateur est admin
    const users = await supabaseAPI.select('Users', { id: userId });
    const user = users[0];

    if (user?.role !== 'admin') {
      return res.status(403).json({ message: 'Accès admin requis' });
    }

    const tickets = await supabaseAPI.select('Tickets', { id: ticketId });
    const ticket = tickets[0];

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    // Générer les données de sécurité
    const securityData = ticketSignatureService.generateSecurityData(ticket);

    // Mettre à jour le ticket
    await supabaseAPI.update('Tickets', {
      signature: securityData.signature,
      content_hash: securityData.content_hash,
      signature_version: securityData.signature_version,
      updated_at: new Date().toISOString(),
    }, { id: ticketId });

    res.json({
      message: 'Ticket signé avec succès',
      ticketId,
      signature_version: securityData.signature_version,
    });
  } catch (err) {
    console.error('Erreur signature ticket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/tickets/alerts
 * Liste les alertes de sécurité (admin)
 */
router.get('/alerts', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { status = 'new', eventId } = req.query;

  try {
    // Vérifier que l'utilisateur est admin ou modérateur
    const users = await supabaseAPI.select('Users', { id: userId });
    const user = users[0];

    if (user?.role !== 'admin' && user?.role !== 'moderator') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (eventId) {
      filter.event_id = parseInt(eventId);
    }

    let alerts = [];
    try {
      alerts = await supabaseAPI.select(
        'TicketSecurityAlerts',
        filter,
        { limit: 50, order: 'created_at.desc' }
      );
    } catch (e) {
      // Table peut ne pas exister
    }

    res.json({ alerts });
  } catch (err) {
    console.error('Erreur récupération alertes:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Helpers

async function logScan(data) {
  try {
    await supabaseAPI.insert('TicketScans', {
      ticket_id: data.ticketId,
      event_id: data.eventId,
      scanned_by: data.scannedBy,
      scan_result: data.result,
      device_id: data.deviceId,
      device_info: data.deviceInfo,
      ip_address: data.ip,
      location: data.location,
      is_suspicious: data.isSuspicious || false,
      suspicious_reason: data.suspiciousReason,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Erreur log scan:', e?.message);
  }
}

async function createSecurityAlert(data) {
  try {
    await supabaseAPI.insert('TicketSecurityAlerts', {
      ticket_id: data.ticketId,
      event_id: data.eventId,
      alert_type: data.alertType,
      severity: data.severity,
      description: data.description,
      metadata: data.metadata,
      status: 'new',
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Erreur création alerte:', e?.message);
  }
}

module.exports = router;
