import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import logger from '../lib/logger';

const CACHE_KEYS = {
  EVENTS: 'cached_events',
  FEATURED_EVENTS: 'cached_featured_events',
  USER_TICKETS: 'cached_user_tickets',
  USER_FAVORITES: 'cached_user_favorites',
  LAST_SYNC: 'last_sync_timestamp',
  OFFLINE_QUEUE: 'offline_action_queue',
};

const CACHE_EXPIRY = {
  EVENTS: 30 * 60 * 1000, // 30 minutes
  TICKETS: 60 * 60 * 1000, // 1 heure
  FAVORITES: 15 * 60 * 1000, // 15 minutes
};

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface OfflineAction {
  id: string;
  type: 'favorite' | 'unfavorite' | 'comment';
  payload: any;
  createdAt: number;
}

class CacheService {
  private isOnline: boolean = true;
  private listeners: ((isOnline: boolean) => void)[] = [];

  constructor() {
    this.initNetworkListener();
  }

  private initNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? true;

      // Notifier les listeners
      this.listeners.forEach((listener) => listener(this.isOnline));

      // Si on revient en ligne, synchroniser les actions en attente
      if (wasOffline && this.isOnline) {
        this.syncOfflineActions();
      }
    });
  }

  // Vérifier la connexion
  async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? true;
    return this.isOnline;
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  // S'abonner aux changements de connexion
  onConnectionChange(callback: (isOnline: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  // Sauvegarder en cache
  async set<T>(key: string, data: T, expiryMs: number = CACHE_EXPIRY.EVENTS): Promise<void> {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + expiryMs,
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  // Récupérer du cache
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);

      // Vérifier si le cache est expiré
      if (Date.now() > cacheItem.expiresAt) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // Récupérer même si expiré (pour mode hors ligne)
  async getEvenIfExpired<T>(key: string): Promise<{ data: T | null; isExpired: boolean }> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return { data: null, isExpired: true };

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      const isExpired = Date.now() > cacheItem.expiresAt;

      return { data: cacheItem.data, isExpired };
    } catch (error) {
      logger.error('Cache get error:', error);
      return { data: null, isExpired: true };
    }
  }

  // Supprimer du cache
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error('Cache remove error:', error);
    }
  }

  // Vider tout le cache
  async clear(): Promise<void> {
    try {
      const keys = Object.values(CACHE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  // === Méthodes spécifiques pour les événements ===

  async cacheEvents(events: any[]): Promise<void> {
    await this.set(CACHE_KEYS.EVENTS, events, CACHE_EXPIRY.EVENTS);
  }

  async getCachedEvents(): Promise<any[] | null> {
    if (this.isOnline) {
      return await this.get<any[]>(CACHE_KEYS.EVENTS);
    }
    // En mode hors ligne, retourner même si expiré
    const { data } = await this.getEvenIfExpired<any[]>(CACHE_KEYS.EVENTS);
    return data;
  }

  async cacheFeaturedEvents(events: any[]): Promise<void> {
    await this.set(CACHE_KEYS.FEATURED_EVENTS, events, CACHE_EXPIRY.EVENTS);
  }

  async getCachedFeaturedEvents(): Promise<any[] | null> {
    if (this.isOnline) {
      return await this.get<any[]>(CACHE_KEYS.FEATURED_EVENTS);
    }
    const { data } = await this.getEvenIfExpired<any[]>(CACHE_KEYS.FEATURED_EVENTS);
    return data;
  }

  // === Méthodes pour les tickets ===

  async cacheUserTickets(userId: string, tickets: any[]): Promise<void> {
    await this.set(`${CACHE_KEYS.USER_TICKETS}_${userId}`, tickets, CACHE_EXPIRY.TICKETS);
  }

  async getCachedUserTickets(userId: string): Promise<any[] | null> {
    const key = `${CACHE_KEYS.USER_TICKETS}_${userId}`;
    if (this.isOnline) {
      return await this.get<any[]>(key);
    }
    const { data } = await this.getEvenIfExpired<any[]>(key);
    return data;
  }

  // === Méthodes pour les favoris ===

  async cacheUserFavorites(userId: string, favorites: any[]): Promise<void> {
    await this.set(`${CACHE_KEYS.USER_FAVORITES}_${userId}`, favorites, CACHE_EXPIRY.FAVORITES);
  }

  async getCachedUserFavorites(userId: string): Promise<any[] | null> {
    const key = `${CACHE_KEYS.USER_FAVORITES}_${userId}`;
    if (this.isOnline) {
      return await this.get<any[]>(key);
    }
    const { data } = await this.getEvenIfExpired<any[]>(key);
    return data;
  }

  // === File d'attente hors ligne ===

  async addToOfflineQueue(action: Omit<OfflineAction, 'id' | 'createdAt'>): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const newAction: OfflineAction = {
        ...action,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
      };
      queue.push(newAction);
      await AsyncStorage.setItem(CACHE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (error) {
      logger.error('Add to offline queue error:', error);
    }
  }

  async getOfflineQueue(): Promise<OfflineAction[]> {
    try {
      const queue = await AsyncStorage.getItem(CACHE_KEYS.OFFLINE_QUEUE);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      logger.error('Get offline queue error:', error);
      return [];
    }
  }

  async clearOfflineQueue(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEYS.OFFLINE_QUEUE);
  }

  async syncOfflineActions(): Promise<void> {
    const queue = await this.getOfflineQueue();
    if (queue.length === 0) return;

    logger.log(`📡 Syncing ${queue.length} offline actions...`);

    // Importer l'API dynamiquement pour éviter les dépendances circulaires
    const { api } = await import('../lib/api');

    for (const action of queue) {
      try {
        switch (action.type) {
          case 'favorite':
            await api.post('/api/favorites', action.payload);
            break;
          case 'unfavorite':
            await api.delete(`/api/favorites/${action.payload.eventId}`);
            break;
          case 'comment':
            await api.post('/api/comments', action.payload);
            break;
        }
        logger.log(`✅ Synced action: ${action.type}`);
      } catch (error) {
        logger.error(`❌ Failed to sync action: ${action.type}`, error);
      }
    }

    await this.clearOfflineQueue();
    logger.log('📡 Offline sync complete');
  }

  // === Utilitaires ===

  async getLastSyncTime(): Promise<number | null> {
    try {
      const timestamp = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch {
      return null;
    }
  }

  async updateLastSyncTime(): Promise<void> {
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
  }

  async getCacheSize(): Promise<string> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length * 2; // UTF-16 = 2 bytes per char
        }
      }

      if (totalSize < 1024) return `${totalSize} B`;
      if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(1)} KB`;
      return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
    } catch {
      return '0 B';
    }
  }
}

export const cacheService = new CacheService();
export { CACHE_KEYS, CACHE_EXPIRY };
