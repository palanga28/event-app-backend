const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Service de génération et validation de QR codes pour les tickets
 */
class QRCodeService {
  /**
   * Génère un code unique et sécurisé pour un ticket
   * @param {number} ticketId - ID du ticket
   * @param {number} userId - ID de l'utilisateur
   * @param {number} eventId - ID de l'événement
   * @returns {string} Code unique
   */
  generateTicketCode(ticketId, userId, eventId) {
    const uuid = uuidv4();
    const timestamp = Date.now();
    const data = `${ticketId}-${userId}-${eventId}-${timestamp}-${uuid}`;
    
    // Hash SHA256 pour sécurité
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    // Prendre les 32 premiers caractères pour un code plus court
    return hash.substring(0, 32).toUpperCase();
  }

  /**
   * Génère un QR code en base64 à partir d'un code ticket
   * @param {string} ticketCode - Code unique du ticket
   * @returns {Promise<string>} QR code en base64
   */
  async generateQRCode(ticketCode) {
    try {
      // Générer le QR code en base64
      const qrCodeDataURL = await QRCode.toDataURL(ticketCode, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 400,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeDataURL;
    } catch (err) {
      console.error('❌ Erreur génération QR code:', err);
      throw new Error('Impossible de générer le QR code');
    }
  }

  /**
   * Génère un QR code complet pour un ticket (code + image)
   * @param {number} ticketId - ID du ticket
   * @param {number} userId - ID de l'utilisateur
   * @param {number} eventId - ID de l'événement
   * @returns {Promise<{code: string, qrCode: string}>} Code et QR code en base64
   */
  async generateTicketQRCode(ticketId, userId, eventId) {
    const code = this.generateTicketCode(ticketId, userId, eventId);
    const qrCode = await this.generateQRCode(code);
    
    return {
      code,
      qrCode
    };
  }

  /**
   * Valide un code ticket
   * @param {string} code - Code à valider
   * @returns {boolean} True si le format est valide
   */
  validateTicketCodeFormat(code) {
    // Vérifier que c'est une chaîne de 32 caractères hexadécimaux
    return /^[A-F0-9]{32}$/.test(code);
  }
}

module.exports = new QRCodeService();
