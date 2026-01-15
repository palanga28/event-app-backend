/**
 * Middleware de validation basique pour les données entrantes
 * Utilise des validations simples, pour une validation plus complexe,
 * considérer express-validator ou Joi
 */

const validateEvent = (req, res, next) => {
  const { title, startDate, endDate } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ message: 'Le titre est requis' });
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime())) {
      return res.status(400).json({ message: 'Date de début invalide' });
    }
    
    if (isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Date de fin invalide' });
    }
    
    if (end < start) {
      return res.status(400).json({ message: 'La date de fin doit être après la date de début' });
    }
  }

  next();
};

const validateTicketType = (req, res, next) => {
  const { name, price, quantity, eventId } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: 'Le nom est requis' });
  }

  if (price !== undefined && (isNaN(price) || price < 0)) {
    return res.status(400).json({ message: 'Le prix doit être un nombre positif' });
  }

  if (quantity !== undefined && (isNaN(quantity) || quantity < 0 || !Number.isInteger(Number(quantity)))) {
    return res.status(400).json({ message: 'La quantité doit être un entier positif' });
  }

  if (eventId !== undefined && (isNaN(eventId) || eventId <= 0)) {
    return res.status(400).json({ message: 'eventId invalide' });
  }

  next();
};

const validateTicketPurchase = (req, res, next) => {
  const { ticketTypeId, quantity } = req.body;

  if (!ticketTypeId) {
    return res.status(400).json({ message: 'ticketTypeId est requis' });
  }

  if (quantity !== undefined) {
    const qty = Number(quantity);
    if (isNaN(qty) || qty < 1 || qty > 10 || !Number.isInteger(qty)) {
      return res.status(400).json({ message: 'La quantité doit être un entier entre 1 et 10' });
    }
  }

  next();
};

module.exports = {
  validateEvent,
  validateTicketType,
  validateTicketPurchase
};


