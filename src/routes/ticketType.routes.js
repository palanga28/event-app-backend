const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');

console.log('✅ ticketType.routes chargé');

// =========================
// LISTER TOUS LES TYPES DE TICKETS
// =========================
router.get('/', async (req, res) => {
  try {
    const ticketTypes = await supabaseAPI.select('TicketTypes');
    res.json(ticketTypes);
  } catch (err) {
    console.error('Erreur récupération types de tickets:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// LISTER LES TYPES DE TICKETS D'UN ÉVÉNEMENT
// =========================
router.get('/event/:eventId', async (req, res) => {
  const { eventId } = req.params;

  try {
    const ticketTypes = await supabaseAPI.select('TicketTypes', { event_id: parseInt(eventId) });
    res.json(ticketTypes);
  } catch (err) {
    console.error('Erreur récupération types de tickets:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// OBTENIR UN TYPE DE TICKET PAR ID
// =========================
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const ticketTypeId = parseInt(id);

  try {
    if (isNaN(ticketTypeId) || ticketTypeId <= 0) {
      return res.status(400).json({ message: 'ID type de ticket invalide' });
    }

    const ticketTypes = await supabaseAPI.select('TicketTypes', { id: ticketTypeId });
    const ticketType = ticketTypes[0];

    if (!ticketType) {
      return res.status(404).json({ message: 'Type de ticket non trouvé' });
    }

    res.json(ticketType);
  } catch (err) {
    console.error('Erreur récupération type de ticket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// CRÉER UN TYPE DE TICKET (organisateur uniquement)
// =========================
router.post('/', authMiddleware, async (req, res) => {
  const user = req.user;
  const { name, description, price, quantity, eventId } = req.body;

  try {
    console.log('📝 Création type de ticket:', { name, price, quantity, eventId });
    
    const ticketType = await supabaseAPI.insert('TicketTypes', {
      name,
      description,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      available_quantity: parseInt(quantity),
      event_id: parseInt(eventId),
      status: 'active'
    });

    console.log('✅ Type de ticket créé:', ticketType);
    res.status(201).json({ message: 'Type de ticket créé', ticketType });
  } catch (err) {
    console.error('❌ Erreur création type de ticket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// MODIFIER UN TYPE DE TICKET (organisateur uniquement)
// =========================
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const ticketTypeId = parseInt(id);
  const user = req.user;
  const { name, description, price, quantity, status } = req.body;

  try {
    if (isNaN(ticketTypeId) || ticketTypeId <= 0) {
      return res.status(400).json({ message: 'ID type de ticket invalide' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (status) updateData.status = status;

    const ticketType = await supabaseAPI.update('TicketTypes', updateData, { id: ticketTypeId });

    res.json({ message: 'Type de ticket mis à jour', ticketType });
  } catch (err) {
    console.error('Erreur mise à jour type de ticket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// SUPPRIMER UN TYPE DE TICKET (organisateur uniquement)
// =========================
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const ticketTypeId = parseInt(id);

  try {
    if (isNaN(ticketTypeId) || ticketTypeId <= 0) {
      return res.status(400).json({ message: 'ID type de ticket invalide' });
    }

    await supabaseAPI.delete('TicketTypes', { id: ticketTypeId });

    res.json({ message: 'Type de ticket supprimé' });
  } catch (err) {
    console.error('Erreur suppression type de ticket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
