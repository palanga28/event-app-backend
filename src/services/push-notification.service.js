const { Expo } = require('expo-server-sdk');
const { supabaseAPI } = require('../config/api');
const log = require('../config/logger');

/**
 * Service de gestion des notifications push via Expo
 */
class PushNotificationService {
  constructor() {
    this.expo = new Expo();
  }

  /**
   * Enregistrer ou mettre à jour un token push pour un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {string} pushToken - Token Expo push
   * @param {string} deviceId - ID unique de l'appareil
   * @returns {Promise<Object>} Token enregistré
   */
  async registerPushToken(userId, pushToken, deviceId) {
    try {
      // Vérifier que le token est valide
      if (!Expo.isExpoPushToken(pushToken)) {
        throw new Error('Token push invalide');
      }

      // Vérifier si le token existe déjà
      const existingTokens = await supabaseAPI.select('PushTokens', {
        user_id: userId,
        device_id: deviceId,
      });

      if (existingTokens.length > 0) {
        // Mettre à jour
        const updated = await supabaseAPI.update(
          'PushTokens',
          {
            push_token: pushToken,
            updated_at: new Date().toISOString(),
          },
          { id: existingTokens[0].id }
        );
        log.info(`✅ Token push mis à jour pour user ${userId}`);
        return updated;
      } else {
        // Créer
        const created = await supabaseAPI.insert('PushTokens', {
          user_id: userId,
          push_token: pushToken,
          device_id: deviceId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        log.info(`✅ Token push créé pour user ${userId}`);
        return created;
      }
    } catch (error) {
      log.error('❌ Erreur enregistrement token push:', error);
      throw error;
    }
  }

  /**
   * Supprimer un token push
   * @param {number} userId - ID de l'utilisateur
   * @param {string} deviceId - ID de l'appareil
   */
  async unregisterPushToken(userId, deviceId) {
    try {
      const tokens = await supabaseAPI.select('PushTokens', {
        user_id: userId,
        device_id: deviceId,
      });

      if (tokens.length > 0) {
        await supabaseAPI.delete('PushTokens', { id: tokens[0].id });
        log.info(`✅ Token push supprimé pour user ${userId}`);
      }
    } catch (error) {
      log.error('❌ Erreur suppression token push:', error);
      throw error;
    }
  }

  /**
   * Récupérer tous les tokens push d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<Array>} Liste des tokens
   */
  async getUserPushTokens(userId) {
    try {
      const tokens = await supabaseAPI.select('PushTokens', {
        user_id: userId,
      });
      return tokens.map((t) => t.push_token);
    } catch (error) {
      log.error('❌ Erreur récupération tokens:', error);
      return [];
    }
  }

  /**
   * Envoyer une notification push à un ou plusieurs utilisateurs
   * @param {Array<number>} userIds - IDs des utilisateurs
   * @param {Object} notification - Contenu de la notification
   * @param {string} notification.title - Titre
   * @param {string} notification.body - Message
   * @param {Object} notification.data - Données additionnelles
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async sendNotification(userIds, notification) {
    try {
      // Récupérer tous les tokens des utilisateurs
      const allTokens = [];
      for (const userId of userIds) {
        const tokens = await this.getUserPushTokens(userId);
        allTokens.push(...tokens);
      }

      if (allTokens.length === 0) {
        log.warn('⚠️  Aucun token push trouvé');
        return { success: 0, failure: 0 };
      }

      // Créer les messages
      const messages = allTokens.map((token) => ({
        to: token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
      }));

      // Envoyer par chunks de 100 (limite Expo)
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          log.error('❌ Erreur envoi chunk:', error);
        }
      }

      // Compter les succès et échecs
      const success = tickets.filter((t) => t.status === 'ok').length;
      const failure = tickets.filter((t) => t.status === 'error').length;

      log.info(`📱 Notifications envoyées: ${success} succès, ${failure} échecs`);

      return { success, failure, tickets };
    } catch (error) {
      log.error('❌ Erreur envoi notification:', error);
      throw error;
    }
  }

  /**
   * Envoyer une notification à tous les utilisateurs
   * @param {Object} notification - Contenu de la notification
   */
  async sendToAll(notification) {
    try {
      const users = await supabaseAPI.select('Users', {});
      const userIds = users.map((u) => u.id);
      return await this.sendNotification(userIds, notification);
    } catch (error) {
      log.error('❌ Erreur envoi notification globale:', error);
      throw error;
    }
  }

  /**
   * Envoyer une notification de nouvel événement
   * @param {Object} event - Événement créé
   */
  async notifyNewEvent(event) {
    try {
      // Récupérer tous les utilisateurs sauf le créateur
      const users = await supabaseAPI.select('Users', {});
      const userIds = users
        .filter((u) => u.id !== event.organizer_id)
        .map((u) => u.id);

      await this.sendNotification(userIds, {
        title: '🎉 Nouvel événement',
        body: `${event.title} - ${new Date(event.date).toLocaleDateString('fr-FR')}`,
        data: {
          type: 'new_event',
          eventId: event.id,
          screen: 'EventDetail',
        },
      });

      log.info(`📱 Notification nouvel événement envoyée: ${event.title}`);
    } catch (error) {
      log.error('❌ Erreur notification nouvel événement:', error);
    }
  }

  /**
   * Envoyer un rappel avant un événement
   * @param {Object} event - Événement
   * @param {Array<number>} userIds - IDs des participants
   */
  async notifyEventReminder(event, userIds) {
    try {
      await this.sendNotification(userIds, {
        title: '⏰ Rappel d\'événement',
        body: `${event.title} commence bientôt !`,
        data: {
          type: 'event_reminder',
          eventId: event.id,
          screen: 'EventDetail',
        },
      });

      log.info(`📱 Rappel événement envoyé: ${event.title}`);
    } catch (error) {
      log.error('❌ Erreur rappel événement:', error);
    }
  }

  /**
   * Envoyer une confirmation d'achat de ticket
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} ticket - Ticket acheté
   * @param {Object} event - Événement
   */
  async notifyTicketPurchase(userId, ticket, event) {
    try {
      await this.sendNotification([userId], {
        title: '✅ Ticket acheté',
        body: `Votre ticket pour ${event.title} a été confirmé !`,
        data: {
          type: 'ticket_purchase',
          ticketId: ticket.id,
          eventId: event.id,
          screen: 'TicketDetail',
        },
      });

      log.info(`📱 Confirmation achat ticket envoyée: user ${userId}`);
    } catch (error) {
      log.error('❌ Erreur notification achat ticket:', error);
    }
  }

  /**
   * Envoyer une notification de validation de ticket
   * @param {number} userId - ID du propriétaire du ticket
   * @param {Object} event - Événement
   */
  async notifyTicketValidated(userId, event) {
    try {
      await this.sendNotification([userId], {
        title: '🎫 Ticket validé',
        body: `Votre ticket pour ${event.title} a été validé. Bon événement !`,
        data: {
          type: 'ticket_validated',
          eventId: event.id,
          screen: 'MyTickets',
        },
      });

      log.info(`📱 Notification validation ticket envoyée: user ${userId}`);
    } catch (error) {
      log.error('❌ Erreur notification validation ticket:', error);
    }
  }

  /**
   * Envoyer une notification de nouveau commentaire
   * @param {number} userId - ID du créateur de l'événement
   * @param {Object} comment - Commentaire
   * @param {Object} event - Événement
   */
  async notifyNewComment(userId, comment, event) {
    try {
      await this.sendNotification([userId], {
        title: '💬 Nouveau commentaire',
        body: `${comment.user_name} a commenté sur ${event.title}`,
        data: {
          type: 'new_comment',
          commentId: comment.id,
          eventId: event.id,
          screen: 'EventDetail',
        },
      });

      log.info(`📱 Notification nouveau commentaire envoyée: user ${userId}`);
    } catch (error) {
      log.error('❌ Erreur notification commentaire:', error);
    }
  }

  /**
   * Envoyer une notification de nouveau follower
   * @param {number} userId - ID de l'utilisateur suivi
   * @param {Object} follower - Utilisateur qui suit
   */
  async notifyNewFollower(userId, follower) {
    try {
      await this.sendNotification([userId], {
        title: '👤 Nouveau follower',
        body: `${follower.name} vous suit maintenant`,
        data: {
          type: 'new_follower',
          followerId: follower.id,
          screen: 'UserProfile',
        },
      });

      log.info(`📱 Notification nouveau follower envoyée: user ${userId}`);
    } catch (error) {
      log.error('❌ Erreur notification follower:', error);
    }
  }
}

module.exports = new PushNotificationService();
