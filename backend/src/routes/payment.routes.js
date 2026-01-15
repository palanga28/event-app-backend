const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const WonyaSoftService = require('../services/wonyasoft.service');
const QRCodeService = require('../services/qrcode.service');

console.log('✅ payment.routes chargé');

// =========================
// INITIER UN PAIEMENT POUR UN TICKET
// =========================
router.post('/initiate', authMiddleware, async (req, res) => {
  const user = req.user;
  const { ticketTypeId, quantity, mobileNumber, currency } = req.body;

  try {
    const ticketTypeIdNum = parseInt(ticketTypeId);
    const quantityNum = parseInt(quantity) || 1;

    // Validations
    if (isNaN(ticketTypeIdNum) || ticketTypeIdNum <= 0) {
      return res.status(400).json({ message: 'ID type de ticket invalide' });
    }

    if (quantityNum < 1 || quantityNum > 10) {
      return res.status(400).json({ message: 'La quantité doit être entre 1 et 10' });
    }

    if (!mobileNumber || !/^0[0-9]{9}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Numéro Mobile Money invalide (format: 0XXXXXXXXX)' });
    }

    const validCurrencies = ['CDF', 'USD'];
    const selectedCurrency = currency && validCurrencies.includes(currency.toUpperCase()) 
      ? currency.toUpperCase() 
      : 'CDF';

    // Vérifier que le type de ticket existe et a assez de places
    const ticketTypes = await supabaseAPI.select('TicketTypes', { id: ticketTypeIdNum });
    const ticketType = ticketTypes[0];

    if (!ticketType) {
      return res.status(404).json({ message: 'Type de ticket non trouvé' });
    }

    if (ticketType.available_quantity < quantityNum) {
      return res.status(400).json({ message: 'Places insuffisantes' });
    }

    // Récupérer l'événement pour le motif
    const events = await supabaseAPI.select('Events', { id: ticketType.event_id });
    const event = events[0];

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Calculer le montant total
    const totalAmount = ticketType.price * quantityNum;

    // Générer la référence de transaction
    const transactionRef = WonyaSoftService.generateTransactionRef();

    // Créer l'enregistrement de paiement en attente
    const payment = await supabaseAPI.insert('Payments', {
      user_id: user.id,
      event_id: ticketType.event_id,
      ticket_type_id: ticketTypeIdNum,
      quantity: quantityNum,
      amount: totalAmount,
      currency: selectedCurrency,
      mobile_number: mobileNumber,
      transaction_ref: transactionRef,
      status: 'pending',
      provider: 'wonyasoft',
      created_at: new Date().toISOString(),
    });

    // Initier le paiement WonyaSoft
    const description = `Ticket ${ticketType.name} x${quantityNum} - ${event.title}`;
    
    const wonyaResult = await WonyaSoftService.createPayment({
      mobileNumber,
      amount: totalAmount,
      currency: selectedCurrency,
      description,
      transactionRef,
    });

    // Mettre à jour le paiement avec l'ID WonyaSoft
    await supabaseAPI.update('Payments', {
      provider_transaction_id: wonyaResult.documentId,
      status: 'processing',
    }, { id: payment.id });

    res.status(201).json({
      message: 'Paiement initié avec succès',
      payment: {
        id: payment.id,
        transactionRef,
        amount: totalAmount,
        currency: selectedCurrency,
        status: 'processing',
        ticketType: ticketType.name,
        event: event.title,
        quantity: quantityNum,
      },
    });
  } catch (err) {
    console.error('❌ Erreur initiation paiement:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

// =========================
// VÉRIFIER LE STATUT D'UN PAIEMENT
// =========================
router.get('/status/:transactionRef', authMiddleware, async (req, res) => {
  const user = req.user;
  const { transactionRef } = req.params;

  try {
    // Récupérer le paiement local
    const payments = await supabaseAPI.select('Payments', { transaction_ref: transactionRef });
    const payment = payments[0];

    if (!payment) {
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (payment.user_id !== user.id) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    // Si déjà complété ou échoué, retourner le statut local
    if (payment.status === 'completed' || payment.status === 'failed') {
      return res.json({
        transactionRef,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        ticketId: payment.ticket_id,
      });
    }

    // Sinon, vérifier auprès de WonyaSoft
    try {
      const wonyaResult = await WonyaSoftService.getTransactionStatus(transactionRef);
      
      console.log('📊 WonyaSoft réponse complète:', JSON.stringify(wonyaResult.data, null, 2));
      
      // Interpréter le statut WonyaSoft (adapter selon leur API)
      // WonyaSoft retourne: StatutTransa: 'Succes' ou 'Echec'
      const wonyaData = wonyaResult.data || {};
      const wonyaStatus = (
        wonyaData.StatutTransa ||
        wonyaData.statutTransa ||
        wonyaData.status || 
        wonyaData.Statut || 
        wonyaData.statut || 
        wonyaData.State || 
        wonyaData.state ||
        wonyaData.etat ||
        wonyaData.Etat ||
        ''
      ).toString().toLowerCase();
      
      console.log('📊 Statut WonyaSoft détecté:', wonyaStatus);
      
      let newStatus = payment.status;

      // Statuts de succès possibles (incluant 'succes' sans accent de WonyaSoft)
      if (['success', 'succes', 'succès', 'completed', 'paid', 'valide', 'validé', 'approved', 'confirme', 'confirmé', '1', 'true'].includes(wonyaStatus)) {
        newStatus = 'completed';
      } 
      // Statuts d'échec possibles
      else if (['failed', 'cancelled', 'rejected', 'annule', 'annulé', 'refuse', 'refusé', 'error', 'echec', 'échoué', '0', 'false'].includes(wonyaStatus)) {
        newStatus = 'failed';
      }
      
      console.log('📊 Nouveau statut calculé:', newStatus, '(ancien:', payment.status, ')');

      // Si le statut a changé, mettre à jour
      if (newStatus !== payment.status) {
        await supabaseAPI.update('Payments', { status: newStatus }, { id: payment.id });

        // Si paiement réussi, créer le ticket
        if (newStatus === 'completed' && !payment.ticket_id) {
          const ticket = await createTicketFromPayment(payment);
          await supabaseAPI.update('Payments', { ticket_id: ticket.id }, { id: payment.id });
          payment.ticket_id = ticket.id;
        }
      }

      res.json({
        transactionRef,
        status: newStatus,
        amount: payment.amount,
        currency: payment.currency,
        ticketId: payment.ticket_id,
        providerStatus: wonyaResult.data?.status,
      });
    } catch (wonyaError) {
      // En cas d'erreur WonyaSoft, retourner le statut local
      console.error('Erreur vérification WonyaSoft:', wonyaError.message);
      res.json({
        transactionRef,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        ticketId: payment.ticket_id,
      });
    }
  } catch (err) {
    console.error('❌ Erreur vérification statut:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// WEBHOOK CALLBACK WONYASOFT
// =========================
router.post('/webhook/wonyasoft', async (req, res) => {
  console.log('📥 Webhook WonyaSoft reçu:', JSON.stringify(req.body));

  try {
    const { RefTransa, status, documentId } = req.body;

    if (!RefTransa) {
      return res.status(400).json({ message: 'RefTransa manquant' });
    }

    // Récupérer le paiement
    const payments = await supabaseAPI.select('Payments', { transaction_ref: RefTransa });
    const payment = payments[0];

    if (!payment) {
      console.error('❌ Webhook: Paiement non trouvé pour', RefTransa);
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }

    // Interpréter le statut
    const statusLower = (status || '').toLowerCase();
    let newStatus = payment.status;

    if (statusLower === 'success' || statusLower === 'completed' || statusLower === 'paid') {
      newStatus = 'completed';
    } else if (statusLower === 'failed' || statusLower === 'cancelled' || statusLower === 'rejected') {
      newStatus = 'failed';
    }

    console.log(`📝 Webhook: ${RefTransa} - ${payment.status} -> ${newStatus}`);

    // Mettre à jour le paiement
    await supabaseAPI.update('Payments', {
      status: newStatus,
      provider_transaction_id: documentId || payment.provider_transaction_id,
      webhook_received_at: new Date().toISOString(),
    }, { id: payment.id });

    // Si paiement réussi, créer le ticket
    if (newStatus === 'completed' && !payment.ticket_id) {
      const ticket = await createTicketFromPayment(payment);
      await supabaseAPI.update('Payments', { ticket_id: ticket.id }, { id: payment.id });
      console.log('✅ Ticket créé:', ticket.id);
    }

    res.json({ message: 'Webhook traité', status: newStatus });
  } catch (err) {
    console.error('❌ Erreur webhook:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// HISTORIQUE DES PAIEMENTS UTILISATEUR
// =========================
router.get('/history', authMiddleware, async (req, res) => {
  const user = req.user;

  try {
    const payments = await supabaseAPI.select('Payments', { user_id: user.id });

    // Enrichir avec les détails
    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const [events, ticketTypes] = await Promise.all([
          supabaseAPI.select('Events', { id: payment.event_id }),
          supabaseAPI.select('TicketTypes', { id: payment.ticket_type_id }),
        ]);

        return {
          ...payment,
          event: events[0] || null,
          ticketType: ticketTypes[0] || null,
        };
      })
    );

    // Trier par date décroissante
    paymentsWithDetails.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(paymentsWithDetails);
  } catch (err) {
    console.error('❌ Erreur historique paiements:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// FONCTION UTILITAIRE: CRÉER TICKET APRÈS PAIEMENT
// =========================
async function createTicketFromPayment(payment) {
  // Récupérer le type de ticket
  const ticketTypes = await supabaseAPI.select('TicketTypes', { id: payment.ticket_type_id });
  const ticketType = ticketTypes[0];

  if (!ticketType) {
    throw new Error('Type de ticket non trouvé');
  }

  // Vérifier la disponibilité
  if (ticketType.available_quantity < payment.quantity) {
    throw new Error('Places insuffisantes');
  }

  // Créer le ticket avec QR code
  const ticket = await supabaseAPI.insert('Tickets', {
    user_id: payment.user_id,
    event_id: payment.event_id,
    ticket_type_id: payment.ticket_type_id,
    status: 'active',
    purchase_date: new Date().toISOString(),
    price_paid: payment.amount,
    payment_id: payment.id,
    quantity: payment.quantity,
  });

  // Générer le QR code pour le ticket
  const { code, qrCode } = await QRCodeService.generateTicketQRCode(
    ticket.id,
    payment.user_id,
    payment.event_id
  );

  // Mettre à jour le ticket avec le QR code
  await supabaseAPI.update('Tickets', {
    qr_code: code,
    qr_code_image: qrCode,
  }, { id: ticket.id });

  ticket.qr_code = code;
  ticket.qr_code_image = qrCode;

  // Mettre à jour la quantité disponible
  await supabaseAPI.update('TicketTypes', {
    available_quantity: ticketType.available_quantity - payment.quantity,
  }, { id: payment.ticket_type_id });

  return ticket;
}

module.exports = router;
