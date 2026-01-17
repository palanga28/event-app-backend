import { useEffect, useState } from 'react';
import notificationService from '../services/notificationService';

/**
 * Hook pour gérer les notifications push
 */
export function useNotifications() {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialiser les notifications au montage
    initializeNotifications();

    // Nettoyer au démontage
    return () => {
      notificationService.cleanup();
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      const token = await notificationService.initialize();
      setPushToken(token);
      setIsInitialized(true);
    } catch (error) {
      console.error('Erreur initialisation notifications:', error);
      setIsInitialized(true);
    }
  };

  const sendTestNotification = async () => {
    try {
      await notificationService.sendTestNotification();
    } catch (error) {
      console.error('Erreur envoi notification test:', error);
      throw error;
    }
  };

  const scheduleLocalNotification = async (
    title: string,
    body: string,
    seconds: number = 5
  ) => {
    try {
      await notificationService.scheduleLocalNotification(title, body, seconds);
    } catch (error) {
      console.error('Erreur planification notification:', error);
      throw error;
    }
  };

  return {
    pushToken,
    isInitialized,
    sendTestNotification,
    scheduleLocalNotification,
  };
}
