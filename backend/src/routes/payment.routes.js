const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');
const WonyaSoftService = require('../services/wonyasoft.service');
const QRCodeService = require('../services/qrcode.service');

console.log('✅ payment.routes chargé');

// =========================
// MODE TEST - Désactiver pour utiliser WonyaSoft en production
// =========================
const TEST_MODE = false; // Mettre à false pour activer WonyaSoft

// =========================
// CONFIGURATION DES COMMISSIONS
// =========================
const COMMISSION_CONFIG = {
  OPERATOR_PERCENT: 2,    // 2% pour l'opérateur Mobile Money (WonyaSoft)
  AMPIA_PERCENT: 4,       // 4% pour AMPIA
  TOTAL_PERCENT: 6,       // Total: 6%
  // Mode de facturation: 'buyer' = l'acheteur paie les frais, 'organizer' = l'organisateur paie
  FEE_MODE: 'buyer',
};

/**
 * Calcule les frais et montants pour une transaction
 * @param {number} basePrice - Prix de base du billet
 * @param {number} quantity - Quantité de billets
 * @returns {Object} Détails des montants
 */
function calculateFees(basePrice, quantity) {
  const subtotal = basePrice * quantity;
  
  if (COMMISSION_CONFIG.FEE_MODE === 'buyer') {
    // L'acheteur paie les frais en plus du prix du billet
    const operatorFee = Math.ceil(subtotal * COMMISSION_CONFIG.OPERATOR_PERCENT / 100);
    const ampiaFee = Math.ceil(subtotal * COMMISSION_CONFIG.AMPIA_PERCENT / 100);
    const totalFees = operatorFee + ampiaFee;
    const totalAmount = subtotal + totalFees;
    
    return {
      subtotal,           // Prix des billets
      operatorFee,        // Frais opérateur (2%)
      ampiaFee,           // Frais AMPIA (4%)
      totalFees,          // Total des frais
      totalAmount,        // Montant total à payer par l'acheteur
      organizerReceives: subtotal,  // Ce que l'organisateur reçoit
      feeMode: 'buyer',
    };
  } else {
    // L'organisateur paie les frais (prélevés sur le prix du billet)
    const operatorFee = Math.ceil(subtotal * COMMISSION_CONFIG.OPERATOR_PERCENT / 100);
    const ampiaFee = Math.ceil(subtotal * COMMISSION_CONFIG.AMPIA_PERCENT / 100);
    const totalFees = operatorFee + ampiaFee;
    
    return {
      subtotal,
      operatorFee,
      ampiaFee,
      totalFees,
      totalAmount: subtotal,  // L'acheteur paie le prix affiché
      organizerReceives: subtotal - totalFees,  // Organisateur reçoit moins
      feeMode: 'organizer',
    };
  }
}

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

    // En mode test, le numéro mobile n'est pas obligatoire
    if (!TEST_MODE && (!mobileNumber || !/^0[0-9]{9}$/.test(mobileNumber))) {
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

    // Calculer les frais et montants
    const feeDetails = calculateFees(ticketType.price, quantityNum);
    const totalAmount = feeDetails.totalAmount;

    // Générer la référence de transaction
    const transactionRef = WonyaSoftService.generateTransactionRef();

    // MODE TEST: Créer directement le ticket sans paiement réel
    if (TEST_MODE) {
      console.log('🧪 MODE TEST: Création de ticket sans paiement WonyaSoft');
      console.log('💰 Détails frais:', feeDetails);
      
      // Créer l'enregistrement de paiement comme "completed"
      const payment = await supabaseAPI.insert('Payments', {
        user_id: user.id,
        event_id: ticketType.event_id,
        ticket_type_id: ticketTypeIdNum,
        quantity: quantityNum,
        amount: totalAmount,
        subtotal: feeDetails.subtotal,
        operator_fee: feeDetails.operatorFee,
        ampia_fee: feeDetails.ampiaFee,
        total_fees: feeDetails.totalFees,
        organizer_receives: feeDetails.organizerReceives,
        fee_mode: feeDetails.feeMode,
        currency: selectedCurrency,
        mobile_number: mobileNumber || '0000000000',
        transaction_ref: transactionRef,
        status: 'completed',
        provider: 'test_mode',
        created_at: new Date().toISOString(),
      });

      // Créer le ticket directement (passer l'objet payment complet)
      const ticket = await createTicketFromPayment(payment);

      return res.status(201).json({
        message: '🧪 MODE TEST: Ticket créé avec succès (sans paiement réel)',
        payment: {
          id: payment.id,
          transactionRef,
          amount: totalAmount,
          currency: selectedCurrency,
          status: 'completed',
          ticketType: ticketType.name,
          event: event.title,
          quantity: quantityNum,
        },
        fees: {
          subtotal: feeDetails.subtotal,
          operatorFee: feeDetails.operatorFee,
          ampiaFee: feeDetails.ampiaFee,
          totalFees: feeDetails.totalFees,
          totalAmount: feeDetails.totalAmount,
          organizerReceives: feeDetails.organizerReceives,
          feeMode: feeDetails.feeMode,
        },
        ticket: ticket,
      });
    }

    // MODE PRODUCTION: Utiliser WonyaSoft
    // Créer l'enregistrement de paiement en attente
    const payment = await supabaseAPI.insert('Payments', {
      user_id: user.id,
      event_id: ticketType.event_id,
      ticket_type_id: ticketTypeIdNum,
      quantity: quantityNum,
      amount: totalAmount,
      subtotal: feeDetails.subtotal,
      operator_fee: feeDetails.operatorFee,
      ampia_fee: feeDetails.ampiaFee,
      total_fees: feeDetails.totalFees,
      organizer_receives: feeDetails.organizerReceives,
      fee_mode: feeDetails.feeMode,
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
// CALCULER LES FRAIS (endpoint public pour affichage)
// =========================
router.post('/calculate-fees', async (req, res) => {
  const { price, quantity } = req.body;
  
  try {
    const priceNum = parseFloat(price) || 0;
    const quantityNum = parseInt(quantity) || 1;
    
    if (priceNum <= 0) {
      return res.status(400).json({ message: 'Prix invalide' });
    }
    
    const feeDetails = calculateFees(priceNum, quantityNum);
    
    res.json({
      ...feeDetails,
      breakdown: {
        ticketPrice: priceNum,
        quantity: quantityNum,
        operatorPercent: COMMISSION_CONFIG.OPERATOR_PERCENT,
        ampiaPercent: COMMISSION_CONFIG.AMPIA_PERCENT,
        totalPercent: COMMISSION_CONFIG.TOTAL_PERCENT,
      },
    });
  } catch (err) {
    console.error('❌ Erreur calcul frais:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// STATISTIQUES DES COMMISSIONS (Admin)
// =========================
router.get('/commission-stats', authMiddleware, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }
    
    // Récupérer tous les paiements complétés
    const payments = await supabaseAPI.select('Payments', { status: 'completed' }, {}, true);
    
    // Calculer les totaux
    const stats = {
      totalTransactions: payments.length,
      totalAmount: 0,
      totalSubtotal: 0,
      totalOperatorFees: 0,
      totalAmpiaFees: 0,
      totalFees: 0,
      totalOrganizerReceives: 0,
      byCurrency: {},
    };
    
    payments.forEach(p => {
      const currency = p.currency || 'CDF';
      
      if (!stats.byCurrency[currency]) {
        stats.byCurrency[currency] = {
          transactions: 0,
          amount: 0,
          subtotal: 0,
          operatorFees: 0,
          ampiaFees: 0,
          fees: 0,
          organizerReceives: 0,
        };
      }
      
      stats.byCurrency[currency].transactions++;
      stats.byCurrency[currency].amount += p.amount || 0;
      stats.byCurrency[currency].subtotal += p.subtotal || 0;
      stats.byCurrency[currency].operatorFees += p.operator_fee || 0;
      stats.byCurrency[currency].ampiaFees += p.ampia_fee || 0;
      stats.byCurrency[currency].fees += p.total_fees || 0;
      stats.byCurrency[currency].organizerReceives += p.organizer_receives || 0;
      
      stats.totalTransactions++;
      stats.totalAmount += p.amount || 0;
      stats.totalSubtotal += p.subtotal || 0;
      stats.totalOperatorFees += p.operator_fee || 0;
      stats.totalAmpiaFees += p.ampia_fee || 0;
      stats.totalFees += p.total_fees || 0;
      stats.totalOrganizerReceives += p.organizer_receives || 0;
    });
    
    res.json(stats);
  } catch (err) {
    console.error('❌ Erreur stats commissions:', err);
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
  console.log('🎫 createTicketFromPayment appelé avec:', JSON.stringify(payment, null, 2));
  
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

  console.log('🎫 Création du ticket pour user_id:', payment.user_id, 'event_id:', payment.event_id);

  // Créer le ticket
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

  console.log('🎫 Ticket créé:', ticket.id);

  // Générer le QR code pour le ticket
  try {
    const { code, qrCode } = await QRCodeService.generateTicketQRCode(
      ticket.id,
      payment.user_id,
      payment.event_id
    );

    console.log('🎫 QR code généré:', code, 'Image length:', qrCode?.length || 0);

    // Mettre à jour le ticket avec le QR code
    await supabaseAPI.update('Tickets', {
      qr_code: code,
      qr_code_image: qrCode,
    }, { id: ticket.id });

    ticket.qr_code = code;
    ticket.qr_code_image = qrCode;
    
    console.log('🎫 Ticket mis à jour avec QR code');
  } catch (qrErr) {
    console.error('❌ Erreur génération QR code:', qrErr);
  }

  // Mettre à jour la quantité disponible
  await supabaseAPI.update('TicketTypes', {
    available_quantity: ticketType.available_quantity - payment.quantity,
  }, { id: payment.ticket_type_id });

  console.log('🎫 Ticket final:', JSON.stringify(ticket, null, 2));
  return ticket;
}

module.exports = router;
