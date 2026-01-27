const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const PushNotificationService = require('../services/push-notification.service');

console.log('✅ ticket.routes chargé');

// =========================
// OBTENIR LES TICKETS D'UN UTILISATEUR
// =========================
router.get('/user', authMiddleware, async (req, res) => {
  const user = req.user;

  try {
    const tickets = await supabaseAPI.select('Tickets', { user_id: user.id });
    
    // Inclure les détails de l'événement et du type de ticket
    const ticketsWithDetails = await Promise.all(
      tickets.map(async (ticket) => {
        const events = await supabaseAPI.select('Events', { id: ticket.event_id });
        const ticketTypes = await supabaseAPI.select('TicketTypes', { id: ticket.ticket_type_id });
        
        return {
          ...ticket,
          event: events[0] || null,
          ticketType: ticketTypes[0] || null
        };
      })
    );
    
    res.json(ticketsWithDetails);
  } catch (err) {
    console.error('Erreur récupération tickets utilisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// OBTENIR UN TICKET PAR ID
// =========================
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const ticketId = parseInt(id);

  try {
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(400).json({ message: 'ID ticket invalide' });
    }

    const tickets = await supabaseAPI.select('Tickets', { id: ticketId });
    const ticket = tickets[0];

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    // Vérifier que l'utilisateur est le propriétaire ou l'organisateur
    if (ticket.user_id !== user.id) {
      // Vérifier si l'utilisateur est l'organisateur de l'événement
      const events = await supabaseAPI.select('Events', { id: ticket.event_id });
      const event = events[0];
      
      if (!event || event.organizer_id !== user.id) {
        return res.status(403).json({ message: 'Accès interdit' });
      }
    }

    // Inclure les détails
    const [events, ticketTypes] = await Promise.all([
      supabaseAPI.select('Events', { id: ticket.event_id }),
      supabaseAPI.select('TicketTypes', { id: ticket.ticket_type_id })
    ]);

    res.json({
      ...ticket,
      event: events[0] || null,
      ticketType: ticketTypes[0] || null
    });
  } catch (err) {
    console.error('Erreur récupération ticket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// ACHETER UN TICKET
// =========================
router.post('/', authMiddleware, async (req, res) => {
  const user = req.user;
  const { ticketTypeId, quantity } = req.body;

  try {
    const ticketTypeIdNum = parseInt(ticketTypeId);
    const quantityNum = parseInt(quantity) || 1;

    if (isNaN(ticketTypeIdNum) || ticketTypeIdNum <= 0) {
      return res.status(400).json({ message: 'ID type de ticket invalide' });
    }

    if (quantityNum < 1 || quantityNum > 10) {
      return res.status(400).json({ message: 'La quantité doit être entre 1 et 10' });
    }

    // Vérifier que le type de ticket existe et a assez de places
    const ticketTypes = await supabaseAPI.select('TicketTypes', { id: ticketTypeIdNum });
    const ticketType = ticketTypes[0];

    if (!ticketType) {
      return res.status(404).json({ message: 'Type de ticket non trouvé' });
    }

    if (ticketType.available_quantity < quantityNum) {
      return res.status(400).json({ message: 'Places insuffisantes' });
    }

    // Créer le ticket
    const ticket = await supabaseAPI.insert('Tickets', {
      user_id: user.id,
      event_id: ticketType.event_id,
      ticket_type_id: ticketTypeIdNum,
      status: 'active',
      purchase_date: new Date().toISOString(),
      price_paid: ticketType.price * quantityNum
    });

    // Mettre à jour la quantité disponible
    await supabaseAPI.update('TicketTypes', {
      available_quantity: ticketType.available_quantity - quantityNum
    }, { id: ticketTypeIdNum });

    // Notifier l'organisateur de la vente
    try {
      const events = await supabaseAPI.select('Events', { id: ticketType.event_id });
      const event = events[0];
      if (event && event.organizer_id) {
        const totalPrice = ticketType.price * quantityNum;
        
        // Créer notification en base
        await supabaseAPI.insert('Notifications', {
          user_id: event.organizer_id,
          type: 'ticket_sold',
          title: '🎫 Nouvelle vente !',
          message: `${user.name || 'Quelqu\'un'} a acheté ${quantityNum} ticket(s) pour "${event.title}" (${totalPrice} FCFA)`,
          data: JSON.stringify({ eventId: event.id, ticketId: ticket.id, buyerId: user.id, amount: totalPrice }),
          created_at: new Date().toISOString()
        });

        // Envoyer push notification
        await PushNotificationService.sendNotification(
          [event.organizer_id],
          {
            title: '🎫 Nouvelle vente !',
            body: `${user.name || 'Quelqu\'un'} a acheté ${quantityNum} ticket(s) pour "${event.title}"`,
            data: { type: 'ticket_sold', eventId: event.id, screen: 'MyEvents' }
          }
        );
      }
    } catch (notifErr) {
      console.error('Erreur notification vente:', notifErr);
    }

    res.status(201).json({ message: 'Ticket acheté avec succès', ticket });
  } catch (err) {
    console.error('Erreur achat ticket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// ANNULER UN TICKET
// =========================
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const ticketId = parseInt(id);

  try {
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(400).json({ message: 'ID ticket invalide' });
    }

    const tickets = await supabaseAPI.select('Tickets', { id: ticketId });
    const ticket = tickets[0];

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    // Seul le propriétaire peut annuler
    if (ticket.user_id !== user.id) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    // Mettre à jour le statut
    await supabaseAPI.update('Tickets', {
      status: 'cancelled'
    }, { id: ticketId });

    // Remettre la quantité disponible
    const ticketTypes = await supabaseAPI.select('TicketTypes', { id: ticket.ticket_type_id });
    const ticketType = ticketTypes[0];

    if (ticketType) {
      await supabaseAPI.update('TicketTypes', {
        available_quantity: ticketType.available_quantity + 1
      }, { id: ticket.ticket_type_id });
    }

    res.json({ message: 'Ticket annulé avec succès' });
  } catch (err) {
    console.error('Erreur annulation ticket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
