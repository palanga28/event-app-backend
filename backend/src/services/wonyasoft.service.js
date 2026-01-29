const WONYASOFT_API_URL = process.env.WONYASOFT_API_URL || 'https://api.wonyasoft.com';
const WONYASOFT_TOKEN = process.env.WONYASOFT_TOKEN;
const WONYASOFT_REF_PARTENAIRE = process.env.WONYASOFT_REF_PARTENAIRE || 'ZN959';
const WONYASOFT_CALLBACK_URL = process.env.WONYASOFT_CALLBACK_URL;

/**
 * Service WonyaSoft pour les paiements Mobile Money
 */
class WonyaSoftService {
  /**
   * Génère une référence de transaction unique (exactement 20 caractères alphanumériques)
   */
  static generateTransactionRef() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ref = '';
    for (let i = 0; i < 20; i++) {
      ref += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ref;
  }

  /**
   * Crée un paiement Mobile Money
   * @param {Object} params - Paramètres du paiement
   * @param {string} params.mobileNumber - Numéro Mobile Money (ex: 0810022154)
   * @param {number} params.amount - Montant à payer
   * @param {string} params.currency - Devise (CDF ou USD)
   * @param {string} params.description - Motif du paiement
   * @param {string} [params.transactionRef] - Référence transaction (auto-générée si non fournie)
   * @returns {Promise<Object>} Réponse de l'API WonyaSoft
   */
  static async createPayment({ mobileNumber, amount, currency = 'CDF', description, transactionRef }) {
    if (!WONYASOFT_TOKEN) {
      throw new Error('WONYASOFT_TOKEN non configuré');
    }

    if (!WONYASOFT_CALLBACK_URL) {
      throw new Error('WONYASOFT_CALLBACK_URL non configuré');
    }

    const refTransa = transactionRef || this.generateTransactionRef();

    const payload = {
      RefPartenaire: WONYASOFT_REF_PARTENAIRE,
      callbackUrl: WONYASOFT_CALLBACK_URL,
      MobileMoney: mobileNumber,
      Devise: currency,
      Montant: String(amount),
      Motif: description,
      RefTransa: refTransa,
    };

    console.log('📤 WonyaSoft - Création paiement:', { ...payload, RefPartenaire: '***' });

    try {
      const response = await fetch(`${WONYASOFT_API_URL}/cpayment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WONYASOFT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 15000,
      });

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('❌ WonyaSoft - Réponse non-JSON:', responseText);
        throw new Error('Réponse invalide de WonyaSoft');
      }

      if (!response.ok) {
        console.error('❌ WonyaSoft - Erreur HTTP:', response.status, data);
        throw new Error(data.message || `Erreur WonyaSoft: ${response.status}`);
      }

      console.log('✅ WonyaSoft - Paiement créé:', data);

      return {
        success: true,
        transactionRef: refTransa,
        documentId: data.documentId,
        data,
      };
    } catch (error) {
      console.error('❌ WonyaSoft - Erreur:', error.message);
      throw error;
    }
  }

  /**
   * Consulte le statut d'une transaction
   * @param {string} transactionRef - Référence de la transaction
   * @returns {Promise<Object>} Détails de la transaction
   */
  static async getTransactionStatus(transactionRef) {
    if (!WONYASOFT_TOKEN) {
      throw new Error('WONYASOFT_TOKEN non configuré');
    }

    console.log('📤 WonyaSoft - Consultation transaction:', transactionRef);

    try {
      const response = await fetch(`${WONYASOFT_API_URL}/cpayment/detail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WONYASOFT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ RefTransa: transactionRef }),
        timeout: 15000,
      });

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('❌ WonyaSoft - Réponse non-JSON:', responseText);
        throw new Error('Réponse invalide de WonyaSoft');
      }

      if (!response.ok) {
        console.error('❌ WonyaSoft - Erreur HTTP:', response.status, data);
        throw new Error(data.message || `Erreur WonyaSoft: ${response.status}`);
      }

      console.log('✅ WonyaSoft - Statut transaction:', data);

      return {
        success: true,
        transactionRef,
        data,
      };
    } catch (error) {
      console.error('❌ WonyaSoft - Erreur consultation:', error.message);
      throw error;
    }
  }

  /**
   * Initie un remboursement Mobile Money
   * @param {Object} params - Paramètres du remboursement
   * @param {string} params.mobileNumber - Numéro Mobile Money du destinataire
   * @param {number} params.amount - Montant à rembourser
   * @param {string} params.currency - Devise (CDF ou USD)
   * @param {string} params.description - Motif du remboursement
   * @param {string} params.originalTransactionRef - Référence de la transaction originale
   * @returns {Promise<Object>} Réponse de l'API WonyaSoft
   */
  static async createRefund({ mobileNumber, amount, currency = 'CDF', description, originalTransactionRef }) {
    if (!WONYASOFT_TOKEN) {
      throw new Error('WONYASOFT_TOKEN non configuré');
    }

    const refTransa = this.generateTransactionRef();

    const payload = {
      RefPartenaire: WONYASOFT_REF_PARTENAIRE,
      callbackUrl: WONYASOFT_CALLBACK_URL,
      MobileMoney: mobileNumber,
      Devise: currency,
      Montant: String(amount),
      Motif: `REMBOURSEMENT: ${description} (Ref: ${originalTransactionRef})`,
      RefTransa: refTransa,
      TypeOperation: 'REFUND', // Indiquer qu'il s'agit d'un remboursement
    };

    console.log('📤 WonyaSoft - Création remboursement:', { ...payload, RefPartenaire: '***' });

    try {
      // Note: WonyaSoft peut utiliser un endpoint différent pour les remboursements
      // Adapter selon leur documentation
      const response = await fetch(`${WONYASOFT_API_URL}/cpayment/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WONYASOFT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 15000,
      });

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('❌ WonyaSoft - Réponse non-JSON:', responseText);
        throw new Error('Réponse invalide de WonyaSoft');
      }

      if (!response.ok) {
        console.error('❌ WonyaSoft - Erreur HTTP:', response.status, data);
        throw new Error(data.message || `Erreur WonyaSoft: ${response.status}`);
      }

      console.log('✅ WonyaSoft - Remboursement créé:', data);

      return {
        success: true,
        transactionRef: refTransa,
        originalTransactionRef,
        documentId: data.documentId,
        data,
      };
    } catch (error) {
      console.error('❌ WonyaSoft - Erreur remboursement:', error.message);
      throw error;
    }
  }
}

module.exports = WonyaSoftService;
