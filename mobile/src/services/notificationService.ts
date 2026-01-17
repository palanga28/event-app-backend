import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../lib/api';
import logger from '../lib/logger';

// Configuration du comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private pushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * Initialiser les notifications
   */
  async initialize() {
    try {
      // Vérifier si c'est un appareil physique
      if (!Device.isDevice) {
        logger.log('⚠️  Les notifications push ne fonctionnent pas sur simulateur');
        return null;
      }

      // Demander les permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.log('❌ Permission de notifications refusée');
        return null;
      }

      // Obtenir le token push
      const token = await this.getExpoPushToken();
      this.pushToken = token;

      // Enregistrer le token au backend
      if (token) {
        await this.registerToken(token);
      }

      // Configurer les listeners
      this.setupListeners();

      logger.log('✅ Notifications initialisées');
      return token;
    } catch (error) {
      logger.error('❌ Erreur initialisation notifications:', error);
      return null;
    }
  }

  /**
   * Obtenir le token Expo push
   */
  private async getExpoPushToken(): Promise<string | null> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });

      logger.log('📱 Token push:', token.data);
      return token.data;
    } catch (error) {
      logger.error('❌ Erreur obtention token push:', error);
      return null;
    }
  }

  /**
   * Enregistrer le token au backend
   */
  private async registerToken(pushToken: string) {
    try {
      const deviceId = Constants.deviceId || Constants.sessionId || 'unknown';

      await api.post('/api/push-notifications/register-token', {
        pushToken,
        deviceId,
      });

      logger.log('✅ Token enregistré au backend');
    } catch (error) {
      logger.error('❌ Erreur enregistrement token:', error);
    }
  }

  /**
   * Supprimer le token du backend
   */
  async unregisterToken() {
    try {
      const deviceId = Constants.deviceId || Constants.sessionId || 'unknown';

      await api.post('/api/push-notifications/unregister-token', {
        deviceId,
      });

      logger.log('✅ Token supprimé du backend');
    } catch (error) {
      logger.error('❌ Erreur suppression token:', error);
    }
  }

  /**
   * Configurer les listeners de notifications
   */
  private setupListeners() {
    // Listener pour les notifications reçues quand l'app est au premier plan
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        logger.log('📬 Notification reçue:', notification);
        // Tu peux ajouter une logique personnalisée ici
      }
    );

    // Listener pour les interactions avec les notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        logger.log('👆 Notification cliquée:', response);
        const data = response.notification.request.content.data;
        
        // Navigation basée sur le type de notification
        this.handleNotificationNavigation(data);
      }
    );
  }

  /**
   * Gérer la navigation depuis une notification
   */
  private handleNotificationNavigation(data: any) {
    // Cette fonction sera appelée quand l'utilisateur clique sur une notification
    // Tu peux utiliser le navigation ref pour naviguer
    logger.log('🔗 Navigation vers:', data);

    // Exemple de navigation (à implémenter avec ton système de navigation)
    if (data.screen) {
      // navigation.navigate(data.screen, { ...data });
    }
  }

  /**
   * Envoyer une notification de test
   */
  async sendTestNotification() {
    try {
      const response = await api.post('/api/push-notifications/test');
      logger.log('✅ Notification de test envoyée:', response.data);
      return response.data;
    } catch (error) {
      logger.error('❌ Erreur envoi notification test:', error);
      throw error;
    }
  }

  /**
   * Planifier une notification locale
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    seconds: number = 5
  ) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });

      logger.log(`✅ Notification locale planifiée dans ${seconds}s`);
    } catch (error) {
      logger.error('❌ Erreur planification notification locale:', error);
    }
  }

  /**
   * Annuler toutes les notifications planifiées
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logger.log('✅ Toutes les notifications annulées');
    } catch (error) {
      logger.error('❌ Erreur annulation notifications:', error);
    }
  }

  /**
   * Planifier un rappel pour un événement
   */
  async scheduleEventReminder(
    eventId: number,
    eventTitle: string,
    eventDate: Date,
    reminderMinutes: number = 60 // Par défaut 1h avant
  ) {
    try {
      const reminderDate = new Date(eventDate.getTime() - reminderMinutes * 60 * 1000);
      
      // Ne pas planifier si la date est passée
      if (reminderDate <= new Date()) {
        logger.log('⚠️ Date de rappel déjà passée');
        return null;
      }

      // Calculer le délai en secondes
      const delaySeconds = Math.floor((reminderDate.getTime() - Date.now()) / 1000);
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Rappel événement',
          body: `${eventTitle} commence dans ${reminderMinutes >= 60 ? `${reminderMinutes / 60}h` : `${reminderMinutes} min`}`,
          sound: true,
          data: {
            type: 'event_reminder',
            eventId,
            screen: 'EventDetail',
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
        },
      });

      logger.log(`✅ Rappel planifié pour ${eventTitle} à ${reminderDate.toLocaleString()}`);
      return identifier;
    } catch (error) {
      logger.error('❌ Erreur planification rappel:', error);
      return null;
    }
  }

  /**
   * Annuler un rappel spécifique
   */
  async cancelEventReminder(identifier: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      logger.log('✅ Rappel annulé:', identifier);
    } catch (error) {
      logger.error('❌ Erreur annulation rappel:', error);
    }
  }

  /**
   * Obtenir toutes les notifications planifiées
   */
  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      logger.error('❌ Erreur récupération notifications planifiées:', error);
      return [];
    }
  }

  /**
   * Planifier des rappels pour les tickets achetés
   */
  async scheduleTicketReminders(tickets: any[]) {
    for (const ticket of tickets) {
      if (ticket.event?.start_date) {
        const eventDate = new Date(ticket.event.start_date);
        
        // Rappel 24h avant
        await this.scheduleEventReminder(
          ticket.event.id,
          ticket.event.title,
          eventDate,
          24 * 60 // 24 heures
        );

        // Rappel 1h avant
        await this.scheduleEventReminder(
          ticket.event.id,
          ticket.event.title,
          eventDate,
          60 // 1 heure
        );
      }
    }
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  async getBadgeCount(): Promise<number> {
    try {
      const count = await Notifications.getBadgeCountAsync();
      return count;
    } catch (error) {
      logger.error('❌ Erreur récupération badge count:', error);
      return 0;
    }
  }

  /**
   * Définir le nombre de notifications non lues
   */
  async setBadgeCount(count: number) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      logger.error('❌ Erreur définition badge count:', error);
    }
  }

  /**
   * Nettoyer les listeners
   */
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  /**
   * Obtenir le token push actuel
   */
  getPushToken(): string | null {
    return this.pushToken;
  }
}

export default new NotificationService();
