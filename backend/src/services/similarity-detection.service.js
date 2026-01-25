const crypto = require('crypto');

/**
 * Service de détection de similarité pour les événements
 * Détecte les copies potentielles basées sur titre, images, date/lieu
 */
class SimilarityDetectionService {
  constructor() {
    // Seuils de similarité
    this.TITLE_SIMILARITY_THRESHOLD = 0.7; // 70% de similarité
    this.IMAGE_HASH_MATCH_THRESHOLD = 0.9; // 90% pour les images
  }

  /**
   * Calcule la similarité entre deux chaînes (algorithme de Levenshtein normalisé)
   * @param {string} str1 
   * @param {string} str2 
   * @returns {number} Score de similarité entre 0 et 1
   */
  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Distance de Levenshtein
    const matrix = [];
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
  }

  /**
   * Normalise un titre pour la comparaison
   * @param {string} title 
   * @returns {string} Titre normalisé
   */
  normalizeTitle(title) {
    if (!title) return '';
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
      .replace(/[^a-z0-9\s]/g, '') // Garder que lettres/chiffres
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Génère un hash perceptuel simple pour une URL d'image
   * Note: En production, utiliser une vraie bibliothèque de perceptual hashing
   * @param {string} imageUrl 
   * @returns {string} Hash de l'URL (simplifié)
   */
  generateImageHash(imageUrl) {
    if (!imageUrl) return null;
    // Simplifié: hash de l'URL
    // En production: télécharger l'image et calculer un vrai perceptual hash
    return crypto.createHash('md5').update(imageUrl).digest('hex');
  }

  /**
   * Compare deux événements et retourne un score de similarité
   * @param {Object} event1 
   * @param {Object} event2 
   * @returns {Object} Résultat de comparaison
   */
  compareEvents(event1, event2) {
    const similarities = {
      title: 0,
      images: 0,
      dateLocation: 0,
      overall: 0,
    };
    const flags = [];

    // 1. Similarité des titres
    const normalizedTitle1 = this.normalizeTitle(event1.title);
    const normalizedTitle2 = this.normalizeTitle(event2.title);
    similarities.title = this.calculateStringSimilarity(normalizedTitle1, normalizedTitle2);
    
    if (similarities.title >= this.TITLE_SIMILARITY_THRESHOLD) {
      flags.push({
        type: 'title',
        score: similarities.title,
        details: `Titres similaires à ${Math.round(similarities.title * 100)}%`,
      });
    }

    // 2. Similarité des images (comparaison des URLs/hashes)
    const images1 = Array.isArray(event1.images) ? event1.images : [];
    const images2 = Array.isArray(event2.images) ? event2.images : [];
    
    let imageMatchCount = 0;
    for (const img1 of images1) {
      for (const img2 of images2) {
        if (img1 === img2) {
          imageMatchCount++;
        }
      }
    }
    
    if (images1.length > 0 && images2.length > 0) {
      similarities.images = imageMatchCount / Math.max(images1.length, images2.length);
      
      if (imageMatchCount > 0) {
        flags.push({
          type: 'image',
          score: similarities.images,
          details: `${imageMatchCount} image(s) identique(s)`,
        });
      }
    }

    // 3. Même date et lieu
    const sameDate = event1.start_date && event2.start_date &&
      new Date(event1.start_date).toDateString() === new Date(event2.start_date).toDateString();
    
    const locationSimilarity = this.calculateStringSimilarity(
      event1.location || '',
      event2.location || ''
    );
    
    if (sameDate && locationSimilarity > 0.8) {
      similarities.dateLocation = 1;
      flags.push({
        type: 'date_location',
        score: 1,
        details: 'Même date et lieu similaire',
      });
    } else if (sameDate) {
      similarities.dateLocation = 0.5;
    }

    // Score global pondéré
    similarities.overall = (
      similarities.title * 0.4 +
      similarities.images * 0.4 +
      similarities.dateLocation * 0.2
    );

    return {
      event1Id: event1.id,
      event2Id: event2.id,
      similarities,
      flags,
      isSuspicious: flags.length > 0,
      suspicionLevel: flags.length >= 2 ? 'high' : flags.length === 1 ? 'medium' : 'low',
    };
  }

  /**
   * Recherche les événements similaires à un événement donné
   * @param {Object} targetEvent - Événement à comparer
   * @param {Array} existingEvents - Liste des événements existants
   * @param {Object} options - Options de recherche
   * @returns {Array} Liste des événements similaires avec scores
   */
  findSimilarEvents(targetEvent, existingEvents, options = {}) {
    const {
      excludeOwnEvents = true,
      minSimilarity = 0.5,
      limit = 10,
    } = options;

    const results = [];

    for (const event of existingEvents) {
      // Exclure l'événement lui-même
      if (event.id === targetEvent.id) continue;
      
      // Exclure les événements du même organisateur si demandé
      if (excludeOwnEvents && event.organizer_id === targetEvent.organizer_id) continue;

      const comparison = this.compareEvents(targetEvent, event);
      
      if (comparison.similarities.overall >= minSimilarity || comparison.flags.length > 0) {
        results.push({
          event,
          ...comparison,
        });
      }
    }

    // Trier par score de similarité décroissant
    results.sort((a, b) => b.similarities.overall - a.similarities.overall);

    return results.slice(0, limit);
  }

  /**
   * Vérifie si un nouvel événement est potentiellement une copie
   * @param {Object} newEvent - Nouvel événement à vérifier
   * @param {Array} existingEvents - Événements existants
   * @returns {Object} Résultat de l'analyse
   */
  async checkForDuplicates(newEvent, existingEvents) {
    const similarEvents = this.findSimilarEvents(newEvent, existingEvents, {
      excludeOwnEvents: true,
      minSimilarity: 0.5,
    });

    const highSimilarity = similarEvents.filter(s => s.suspicionLevel === 'high');
    const mediumSimilarity = similarEvents.filter(s => s.suspicionLevel === 'medium');

    return {
      hasPotentialDuplicates: highSimilarity.length > 0,
      suspicionLevel: highSimilarity.length > 0 ? 'high' : 
                      mediumSimilarity.length > 0 ? 'medium' : 'low',
      similarEvents: similarEvents.slice(0, 5),
      summary: {
        highSimilarityCount: highSimilarity.length,
        mediumSimilarityCount: mediumSimilarity.length,
        totalChecked: existingEvents.length,
      },
    };
  }

  /**
   * Détecte les patterns suspects d'un organisateur
   * @param {number} organizerId 
   * @param {Array} organizerEvents - Événements de l'organisateur
   * @param {Array} allEvents - Tous les événements
   * @returns {Object} Analyse des patterns
   */
  analyzeOrganizerPatterns(organizerId, organizerEvents, allEvents) {
    const patterns = {
      suspiciousPatterns: [],
      riskLevel: 'low',
    };

    // 1. Trop d'événements en peu de temps
    const recentEvents = organizerEvents.filter(e => {
      const created = new Date(e.created_at);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return created > dayAgo;
    });

    if (recentEvents.length > 5) {
      patterns.suspiciousPatterns.push({
        type: 'mass_creation',
        details: `${recentEvents.length} événements créés en 24h`,
        severity: 'high',
      });
    }

    // 2. Événements avec titres très similaires entre eux
    for (let i = 0; i < organizerEvents.length; i++) {
      for (let j = i + 1; j < organizerEvents.length; j++) {
        const similarity = this.calculateStringSimilarity(
          this.normalizeTitle(organizerEvents[i].title),
          this.normalizeTitle(organizerEvents[j].title)
        );
        if (similarity > 0.9) {
          patterns.suspiciousPatterns.push({
            type: 'self_duplicate',
            details: `Événements ${organizerEvents[i].id} et ${organizerEvents[j].id} très similaires`,
            severity: 'medium',
          });
        }
      }
    }

    // 3. Copie d'événements d'autres organisateurs
    const otherEvents = allEvents.filter(e => e.organizer_id !== organizerId);
    for (const event of organizerEvents) {
      const duplicates = this.findSimilarEvents(event, otherEvents, {
        excludeOwnEvents: false,
        minSimilarity: 0.7,
        limit: 3,
      });
      
      if (duplicates.length > 0 && duplicates[0].suspicionLevel === 'high') {
        patterns.suspiciousPatterns.push({
          type: 'copy_other',
          details: `Événement ${event.id} semble copier l'événement ${duplicates[0].event.id}`,
          severity: 'high',
          relatedEventId: duplicates[0].event.id,
        });
      }
    }

    // Déterminer le niveau de risque global
    const highCount = patterns.suspiciousPatterns.filter(p => p.severity === 'high').length;
    const mediumCount = patterns.suspiciousPatterns.filter(p => p.severity === 'medium').length;

    if (highCount >= 2) {
      patterns.riskLevel = 'critical';
    } else if (highCount >= 1) {
      patterns.riskLevel = 'high';
    } else if (mediumCount >= 2) {
      patterns.riskLevel = 'medium';
    }

    return patterns;
  }
}

module.exports = new SimilarityDetectionService();
