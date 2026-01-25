const crypto = require('crypto');

/**
 * Service de signature cryptographique pour les tickets
 * Utilise HMAC-SHA256 pour signer et vérifier les tickets
 */
class TicketSignatureService {
  constructor() {
    // Clé secrète pour la signature (doit être configurée en production)
    this.secretKey = process.env.TICKET_SECRET || 'ampia-ticket-secret-key-change-in-production';
    this.signatureVersion = 1;
  }

  /**
   * Génère une signature HMAC pour un ticket
   * @param {Object} ticketData - Données du ticket à signer
   * @returns {string} Signature HMAC en hexadécimal
   */
  signTicket(ticketData) {
    const { ticketId, eventId, userId, qrCode, createdAt } = ticketData;
    
    // Créer le payload à signer (ordre déterministe)
    const payload = JSON.stringify({
      t: ticketId,
      e: eventId,
      u: userId,
      q: qrCode,
      c: createdAt,
      v: this.signatureVersion,
    });

    // Générer la signature HMAC-SHA256
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Vérifie la signature d'un ticket
   * @param {Object} ticketData - Données du ticket
   * @param {string} signature - Signature à vérifier
   * @returns {boolean} True si la signature est valide
   */
  verifySignature(ticketData, signature) {
    if (!signature) return false;
    
    const expectedSignature = this.signTicket(ticketData);
    
    // Comparaison en temps constant pour éviter les timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Génère un hash du contenu du ticket (pour détecter les modifications)
   * @param {Object} ticket - Ticket complet
   * @returns {string} Hash SHA256 du contenu
   */
  generateContentHash(ticket) {
    const content = JSON.stringify({
      id: ticket.id,
      event_id: ticket.event_id,
      user_id: ticket.user_id,
      ticket_type_id: ticket.ticket_type_id,
      qr_code: ticket.qr_code,
      price: ticket.price,
    });

    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 64);
  }

  /**
   * Vérifie si le contenu du ticket a été modifié
   * @param {Object} ticket - Ticket avec content_hash
   * @returns {boolean} True si le contenu est intact
   */
  verifyContentIntegrity(ticket) {
    if (!ticket.content_hash) return true; // Pas de hash = ancien ticket
    
    const currentHash = this.generateContentHash(ticket);
    return currentHash === ticket.content_hash;
  }

  /**
   * Génère les données de sécurité complètes pour un nouveau ticket
   * @param {Object} ticket - Ticket à sécuriser
   * @returns {Object} Données de sécurité {signature, content_hash, signature_version}
   */
  generateSecurityData(ticket) {
    const ticketData = {
      ticketId: ticket.id,
      eventId: ticket.event_id,
      userId: ticket.user_id,
      qrCode: ticket.qr_code,
      createdAt: ticket.created_at,
    };

    return {
      signature: this.signTicket(ticketData),
      content_hash: this.generateContentHash(ticket),
      signature_version: this.signatureVersion,
    };
  }

  /**
   * Valide complètement un ticket (signature + intégrité)
   * @param {Object} ticket - Ticket à valider
   * @returns {Object} Résultat de validation {valid, errors}
   */
  validateTicket(ticket) {
    const errors = [];

    // Vérifier la signature
    if (ticket.signature) {
      const ticketData = {
        ticketId: ticket.id,
        eventId: ticket.event_id,
        userId: ticket.user_id,
        qrCode: ticket.qr_code,
        createdAt: ticket.created_at,
      };

      if (!this.verifySignature(ticketData, ticket.signature)) {
        errors.push('invalid_signature');
      }
    }

    // Vérifier l'intégrité du contenu
    if (!this.verifyContentIntegrity(ticket)) {
      errors.push('content_modified');
    }

    // Vérifier le statut
    if (ticket.status === 'used') {
      errors.push('already_used');
    }

    if (ticket.status === 'cancelled') {
      errors.push('cancelled');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Détecte les scans suspects (trop rapides, même device, etc.)
   * @param {Object} ticket - Ticket scanné
   * @param {Object} scanInfo - Infos du scan actuel
   * @param {Array} recentScans - Scans récents du ticket
   * @returns {Object} Analyse de suspicion {suspicious, reasons}
   */
  detectSuspiciousScan(ticket, scanInfo, recentScans = []) {
    const reasons = [];
    const now = new Date();

    // 1. Scan trop rapide après le dernier (moins de 5 secondes)
    if (ticket.last_scanned_at) {
      const lastScan = new Date(ticket.last_scanned_at);
      const diffSeconds = (now - lastScan) / 1000;
      
      if (diffSeconds < 5) {
        reasons.push('rapid_scan');
      }
    }

    // 2. Device différent du dernier scan (possible copie)
    if (ticket.last_scan_device_id && scanInfo.deviceId) {
      if (ticket.last_scan_device_id !== scanInfo.deviceId && ticket.scan_count > 0) {
        reasons.push('different_device');
      }
    }

    // 3. Trop de scans pour un même ticket (plus de 3)
    if (ticket.scan_count >= 3) {
      reasons.push('excessive_scans');
    }

    // 4. Scans depuis plusieurs locations différentes en peu de temps
    if (recentScans.length >= 2) {
      const locations = recentScans
        .filter(s => s.location && s.location.lat && s.location.lng)
        .map(s => s.location);
      
      if (locations.length >= 2) {
        // Vérifier si les locations sont très éloignées (> 1km en moins de 10 min)
        // Simplifié ici - en production, utiliser une vraie formule de distance
        const hasDistantLocations = locations.some((loc, i) => {
          if (i === 0) return false;
          const prevLoc = locations[i - 1];
          const latDiff = Math.abs(loc.lat - prevLoc.lat);
          const lngDiff = Math.abs(loc.lng - prevLoc.lng);
          return latDiff > 0.01 || lngDiff > 0.01; // ~1km approximatif
        });

        if (hasDistantLocations) {
          reasons.push('location_mismatch');
        }
      }
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
      severity: reasons.length >= 2 ? 'high' : reasons.length === 1 ? 'medium' : 'low',
    };
  }
}

module.exports = new TicketSignatureService();
