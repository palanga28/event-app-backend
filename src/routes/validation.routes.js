const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const QRCodeService = require('../services/qrcode.service');

console.log('✅ validation.routes chargé');

// =========================
// VALIDER UN TICKET PAR QR CODE
// =========================
router.post('/validate', authMiddleware, async (req, res) => {
  const user = req.user;
  const { qrCode } = req.body;

  try {
    // Validation du format
    if (!qrCode || typeof qrCode !== 'string') {
      return res.status(400).json({ message: 'QR code manquant' });
    }

    if (!QRCodeService.validateTicketCodeFormat(qrCode)) {
      return res.status(400).json({ message: 'Format de QR code invalide' });
    }

    // Rechercher le ticket par QR code
    const tickets = await supabaseAPI.select('Tickets', { qr_code: qrCode });
    const ticket = tickets[0];

    if (!ticket) {
      return res.status(404).json({ 
        message: 'Ticket non trouvé',
        valid: false 
      });
    }

    // Récupérer les détails de l'événement
    const events = await supabaseAPI.select('Events', { id: ticket.event_id });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Vérifier que l'utilisateur est l'organisateur de l'événement
    if (event.organizer_id !== user.id) {
      return res.status(403).json({ 
        message: 'Seul l\'organisateur peut valider les tickets' 
      });
    }

    // Vérifier le statut du ticket
    if (ticket.status === 'cancelled') {
      return res.status(400).json({
        message: 'Ce ticket a été annulé',
        valid: false,
        ticket: {
          id: ticket.id,
          status: ticket.status,
          event: event.title,
        }
      });
    }

    if (ticket.status === 'used') {
      // Ticket déjà utilisé
      return res.status(400).json({
        message: 'Ce ticket a déjà été validé',
        valid: false,
        ticket: {
          id: ticket.id,
          status: ticket.status,
          event: event.title,
          validatedAt: ticket.validated_at,
          validatedBy: ticket.validated_by,
        }
      });
    }

    // Vérifier que l'événement n'est pas encore passé
    const eventDate = new Date(event.date);
    const now = new Date();
    
    // Permettre la validation jusqu'à 24h après l'événement
    const maxValidationDate = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);
    
    if (now > maxValidationDate) {
      return res.status(400).json({
        message: 'Cet événement est terminé',
        valid: false,
        ticket: {
          id: ticket.id,
          event: event.title,
          eventDate: event.date,
        }
      });
    }

    // Valider le ticket
    await supabaseAPI.update('Tickets', {
      status: 'used',
      validated_at: new Date().toISOString(),
      validated_by: user.id,
    }, { id: ticket.id });

    // Récupérer les détails du propriétaire du ticket
    const users = await supabaseAPI.select('Users', { id: ticket.user_id });
    const ticketOwner = users[0];

    // Récupérer le type de ticket
    const ticketTypes = await supabaseAPI.select('TicketTypes', { id: ticket.ticket_type_id });
    const ticketType = ticketTypes[0];

    res.json({
      message: 'Ticket validé avec succès',
      valid: true,
      ticket: {
        id: ticket.id,
        status: 'used',
        quantity: ticket.quantity,
        validatedAt: new Date().toISOString(),
        owner: {
          id: ticketOwner?.id,
          name: ticketOwner?.name,
          email: ticketOwner?.email,
        },
        event: {
          id: event.id,
          title: event.title,
          date: event.date,
          location: event.location,
        },
        ticketType: {
          id: ticketType?.id,
          name: ticketType?.name,
          price: ticketType?.price,
          currency: ticketType?.currency,
        }
      }
    });
  } catch (err) {
    console.error('❌ Erreur validation ticket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// VÉRIFIER UN TICKET SANS LE VALIDER
// =========================
router.post('/check', authMiddleware, async (req, res) => {
  const user = req.user;
  const { qrCode } = req.body;

  try {
    if (!qrCode || typeof qrCode !== 'string') {
      return res.status(400).json({ message: 'QR code manquant' });
    }

    if (!QRCodeService.validateTicketCodeFormat(qrCode)) {
      return res.status(400).json({ message: 'Format de QR code invalide' });
    }

    const tickets = await supabaseAPI.select('Tickets', { qr_code: qrCode });
    const ticket = tickets[0];

    if (!ticket) {
      return res.status(404).json({ 
        message: 'Ticket non trouvé',
        valid: false 
      });
    }

    const events = await supabaseAPI.select('Events', { id: ticket.event_id });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.organizer_id !== user.id) {
      return res.status(403).json({ 
        message: 'Seul l\'organisateur peut vérifier les tickets' 
      });
    }

    const users = await supabaseAPI.select('Users', { id: ticket.user_id });
    const ticketOwner = users[0];

    const ticketTypes = await supabaseAPI.select('TicketTypes', { id: ticket.ticket_type_id });
    const ticketType = ticketTypes[0];

    res.json({
      valid: ticket.status === 'active',
      ticket: {
        id: ticket.id,
        status: ticket.status,
        quantity: ticket.quantity,
        purchaseDate: ticket.purchase_date,
        validatedAt: ticket.validated_at,
        owner: {
          id: ticketOwner?.id,
          name: ticketOwner?.name,
          email: ticketOwner?.email,
        },
        event: {
          id: event.id,
          title: event.title,
          date: event.date,
          location: event.location,
        },
        ticketType: {
          id: ticketType?.id,
          name: ticketType?.name,
          price: ticketType?.price,
          currency: ticketType?.currency,
        }
      }
    });
  } catch (err) {
    console.error('❌ Erreur vérification ticket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// HISTORIQUE DES VALIDATIONS POUR UN ÉVÉNEMENT
// =========================
router.get('/history/:eventId', authMiddleware, async (req, res) => {
  const user = req.user;
  const { eventId } = req.params;
  const eventIdNum = parseInt(eventId);

  try {
    if (isNaN(eventIdNum) || eventIdNum <= 0) {
      return res.status(400).json({ message: 'ID événement invalide' });
    }

    // Vérifier que l'utilisateur est l'organisateur
    const events = await supabaseAPI.select('Events', { id: eventIdNum });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.organizer_id !== user.id) {
      return res.status(403).json({ 
        message: 'Seul l\'organisateur peut voir l\'historique' 
      });
    }

    // Récupérer tous les tickets validés pour cet événement
    const tickets = await supabaseAPI.select('Tickets', { 
      event_id: eventIdNum,
      status: 'used'
    });

    // Enrichir avec les détails
    const validations = await Promise.all(
      tickets.map(async (ticket) => {
        const [users, ticketTypes] = await Promise.all([
          supabaseAPI.select('Users', { id: ticket.user_id }),
          supabaseAPI.select('TicketTypes', { id: ticket.ticket_type_id })
        ]);

        return {
          id: ticket.id,
          validatedAt: ticket.validated_at,
          quantity: ticket.quantity,
          owner: {
            id: users[0]?.id,
            name: users[0]?.name,
            email: users[0]?.email,
          },
          ticketType: {
            id: ticketTypes[0]?.id,
            name: ticketTypes[0]?.name,
          }
        };
      })
    );

    // Trier par date de validation décroissante
    validations.sort((a, b) => new Date(b.validatedAt) - new Date(a.validatedAt));

    // Statistiques
    const totalValidated = tickets.reduce((sum, t) => sum + (t.quantity || 1), 0);
    const allTickets = await supabaseAPI.select('Tickets', { event_id: eventIdNum });
    const totalSold = allTickets.reduce((sum, t) => sum + (t.quantity || 1), 0);

    res.json({
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
      },
      statistics: {
        totalSold,
        totalValidated,
        validationRate: totalSold > 0 ? ((totalValidated / totalSold) * 100).toFixed(1) : 0,
      },
      validations,
    });
  } catch (err) {
    console.error('❌ Erreur historique validations:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
