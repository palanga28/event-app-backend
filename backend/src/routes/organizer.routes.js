const express = require('express');
const router = express.Router();
const { supabaseAPI } = require('../config/api');
const authMiddleware = require('../middlewares/auth.middleware');

console.log('✅ organizer.routes chargé v2');

// =========================
// OBTENIR LE SOLDE DE L'ORGANISATEUR
// =========================
router.get('/balance', authMiddleware, async (req, res) => {
  const user = req.user;

  try {
    // Récupérer tous les événements de l'organisateur
    const events = await supabaseAPI.select('Events', { organizer_id: user.id });
    const eventIds = events.map(e => e.id);

    if (eventIds.length === 0) {
      return res.json({
        totalEarnings: 0,
        pendingPayouts: 0,
        completedPayouts: 0,
        availableBalance: 0,
        currency: 'CDF',
        eventCount: 0,
        ticketsSold: 0,
      });
    }

    // Récupérer tous les paiements complétés pour ces événements
    const allPayments = [];
    for (const eventId of eventIds) {
      const payments = await supabaseAPI.select('Payments', { 
        event_id: eventId, 
        status: 'completed' 
      });
      allPayments.push(...payments);
    }

    // Calculer les gains totaux (ce que l'organisateur reçoit après commission)
    let totalEarnings = 0;
    let ticketsSold = 0;
    const earningsByCurrency = {};

    allPayments.forEach(p => {
      const currency = p.currency || 'CDF';
      const organizerReceives = p.organizer_receives || p.subtotal || p.amount || 0;
      
      if (!earningsByCurrency[currency]) {
        earningsByCurrency[currency] = 0;
      }
      earningsByCurrency[currency] += organizerReceives;
      totalEarnings += organizerReceives;
      ticketsSold += p.quantity || 1;
    });

    // Récupérer les demandes de retrait
    let pendingPayouts = 0;
    let completedPayouts = 0;

    try {
      const payouts = await supabaseAPI.select('OrganizerPayouts', { organizer_id: user.id });
      
      payouts.forEach(p => {
        if (p.status === 'pending' || p.status === 'processing') {
          pendingPayouts += parseFloat(p.amount) || 0;
        } else if (p.status === 'completed') {
          completedPayouts += parseFloat(p.amount) || 0;
        }
      });
    } catch (err) {
      // Table peut ne pas exister encore
      console.log('⚠️ Table OrganizerPayouts non disponible');
    }

    // Solde disponible = gains totaux - retraits en cours - retraits complétés
    const availableBalance = totalEarnings - pendingPayouts - completedPayouts;

    res.json({
      totalEarnings,
      pendingPayouts,
      completedPayouts,
      availableBalance,
      earningsByCurrency,
      currency: 'CDF', // Devise principale
      eventCount: events.length,
      ticketsSold,
    });
  } catch (err) {
    console.error('❌ Erreur balance organisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// HISTORIQUE DES GAINS PAR ÉVÉNEMENT
// =========================
router.get('/earnings', authMiddleware, async (req, res) => {
  const user = req.user;

  try {
    // Récupérer tous les événements de l'organisateur
    const events = await supabaseAPI.select('Events', { organizer_id: user.id });

    // Pour chaque événement, calculer les gains
    const earningsPerEvent = await Promise.all(
      events.map(async (event) => {
        const payments = await supabaseAPI.select('Payments', { 
          event_id: event.id, 
          status: 'completed' 
        });

        let totalAmount = 0;
        let organizerReceives = 0;
        let ticketsSold = 0;

        payments.forEach(p => {
          totalAmount += p.amount || 0;
          organizerReceives += p.organizer_receives || p.subtotal || p.amount || 0;
          ticketsSold += p.quantity || 1;
        });

        return {
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.start_date,
          eventImage: event.images?.[0] || null,
          totalAmount,
          organizerReceives,
          ticketsSold,
          transactionCount: payments.length,
        };
      })
    );

    // Trier par date décroissante
    earningsPerEvent.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

    res.json(earningsPerEvent);
  } catch (err) {
    console.error('❌ Erreur earnings organisateur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// OBTENIR/METTRE À JOUR LES INFOS DE PAIEMENT
// =========================
router.get('/payment-info', authMiddleware, async (req, res) => {
  const user = req.user;

  try {
    const infos = await supabaseAPI.select('OrganizerPaymentInfo', { user_id: user.id });
    
    if (infos.length === 0) {
      return res.json(null);
    }

    res.json(infos[0]);
  } catch (err) {
    console.error('❌ Erreur get payment info:', err);
    // Table peut ne pas exister
    res.json(null);
  }
});

router.post('/payment-info', authMiddleware, async (req, res) => {
  const user = req.user;
  const {
    preferred_method,
    mobile_money_phone,
    mobile_money_network,
    mobile_money_name,
    bank_name,
    bank_account_number,
    bank_account_name,
  } = req.body;

  try {
    // Vérifier si existe déjà
    const existing = await supabaseAPI.select('OrganizerPaymentInfo', { user_id: user.id });

    const data = {
      user_id: user.id,
      preferred_method: preferred_method || 'mobile_money',
      mobile_money_phone,
      mobile_money_network,
      mobile_money_name,
      bank_name,
      bank_account_number,
      bank_account_name,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing.length > 0) {
      // Mettre à jour
      result = await supabaseAPI.update('OrganizerPaymentInfo', data, { id: existing[0].id });
    } else {
      // Créer
      data.created_at = new Date().toISOString();
      result = await supabaseAPI.insert('OrganizerPaymentInfo', data);
    }

    res.json({ message: 'Informations de paiement enregistrées', data: result });
  } catch (err) {
    console.error('❌ Erreur save payment info:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// DEMANDER UN RETRAIT
// =========================
router.post('/payout-request', authMiddleware, async (req, res) => {
  const user = req.user;
  const { amount, currency, payout_method, payout_details } = req.body;

  try {
    // Valider le montant
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'Montant invalide' });
    }

    // Montant minimum de retrait (ex: 5000 CDF ou 5 USD)
    const minAmount = currency === 'USD' ? 5 : 5000;
    if (amountNum < minAmount) {
      return res.status(400).json({ 
        message: `Montant minimum de retrait: ${minAmount} ${currency || 'CDF'}` 
      });
    }

    // Vérifier le solde disponible
    const events = await supabaseAPI.select('Events', { organizer_id: user.id });
    const eventIds = events.map(e => e.id);

    let totalEarnings = 0;
    for (const eventId of eventIds) {
      const payments = await supabaseAPI.select('Payments', { 
        event_id: eventId, 
        status: 'completed' 
      });
      payments.forEach(p => {
        totalEarnings += p.organizer_receives || p.subtotal || p.amount || 0;
      });
    }

    // Soustraire les retraits déjà effectués ou en cours
    let usedAmount = 0;
    try {
      const payouts = await supabaseAPI.select('OrganizerPayouts', { organizer_id: user.id });
      payouts.forEach(p => {
        if (p.status !== 'rejected') {
          usedAmount += parseFloat(p.amount) || 0;
        }
      });
    } catch (err) {
      // Table peut ne pas exister
    }

    const availableBalance = totalEarnings - usedAmount;

    if (amountNum > availableBalance) {
      return res.status(400).json({ 
        message: `Solde insuffisant. Disponible: ${availableBalance.toFixed(2)} ${currency || 'CDF'}` 
      });
    }

    // Créer la demande de retrait
    const payout = await supabaseAPI.insert('OrganizerPayouts', {
      organizer_id: user.id,
      amount: amountNum,
      currency: currency || 'CDF',
      status: 'pending',
      payout_method: payout_method || 'mobile_money',
      payout_details: payout_details || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.status(201).json({
      message: 'Demande de retrait créée avec succès',
      payout: {
        id: payout.id,
        amount: amountNum,
        currency: currency || 'CDF',
        status: 'pending',
        created_at: payout.created_at,
      },
    });
  } catch (err) {
    console.error('❌ Erreur payout request:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// HISTORIQUE DES RETRAITS
// =========================
router.get('/payouts', authMiddleware, async (req, res) => {
  const user = req.user;

  try {
    const payouts = await supabaseAPI.select('OrganizerPayouts', { organizer_id: user.id });
    
    // Trier par date décroissante
    payouts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(payouts);
  } catch (err) {
    console.error('❌ Erreur get payouts:', err);
    res.json([]);
  }
});

// =========================
// ANNULER UNE DEMANDE DE RETRAIT (si encore pending)
// =========================
router.delete('/payout/:id', authMiddleware, async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  try {
    const payouts = await supabaseAPI.select('OrganizerPayouts', { id: parseInt(id) });
    const payout = payouts[0];

    if (!payout) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    if (payout.organizer_id !== user.id) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    if (payout.status !== 'pending') {
      return res.status(400).json({ message: 'Seules les demandes en attente peuvent être annulées' });
    }

    await supabaseAPI.delete('OrganizerPayouts', { id: payout.id });

    res.json({ message: 'Demande de retrait annulée' });
  } catch (err) {
    console.error('❌ Erreur cancel payout:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
