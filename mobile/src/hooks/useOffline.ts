import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '../services/cacheService';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import logger from '../lib/logger';

interface UseOfflineOptions {
  autoFetch?: boolean;
}

export function useOfflineEvents(options: UseOfflineOptions = { autoFetch: true }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);

    try {
      const isOnline = await cacheService.checkConnection();
      setIsOffline(!isOnline);

      if (isOnline) {
        // En ligne : récupérer depuis l'API
        const response = await api.get('/api/events?limit=50');
        const data = Array.isArray(response.data) ? response.data : response.data?.value || [];
        setEvents(data);
        setIsFromCache(false);

        // Mettre en cache
        await cacheService.cacheEvents(data);
        await cacheService.updateLastSyncTime();
      } else {
        // Hors ligne : récupérer depuis le cache
        const cachedEvents = await cacheService.getCachedEvents();
        if (cachedEvents) {
          setEvents(cachedEvents);
          setIsFromCache(true);
        }
      }
    } catch (error) {
      logger.error('Fetch events error:', error);
      // En cas d'erreur, essayer le cache
      const cachedEvents = await cacheService.getCachedEvents();
      if (cachedEvents) {
        setEvents(cachedEvents);
        setIsFromCache(true);
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options.autoFetch) {
      fetchEvents();
    }

    // Écouter les changements de connexion
    const unsubscribe = cacheService.onConnectionChange((isOnline) => {
      setIsOffline(!isOnline);
      if (isOnline) {
        fetchEvents();
      }
    });

    return unsubscribe;
  }, [fetchEvents, options.autoFetch]);

  return { events, loading, isOffline, isFromCache, refresh: fetchEvents };
}

export function useOfflineFeaturedEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchFeaturedEvents = useCallback(async () => {
    setLoading(true);

    try {
      const isOnline = cacheService.isConnected();

      if (isOnline) {
        const response = await api.get('/api/events?featured=true&limit=10');
        const data = Array.isArray(response.data) ? response.data : response.data?.value || [];
        setEvents(data);
        setIsFromCache(false);
        await cacheService.cacheFeaturedEvents(data);
      } else {
        const cachedEvents = await cacheService.getCachedFeaturedEvents();
        if (cachedEvents) {
          setEvents(cachedEvents);
          setIsFromCache(true);
        }
      }
    } catch (error) {
      logger.error('Fetch featured events error:', error);
      const cachedEvents = await cacheService.getCachedFeaturedEvents();
      if (cachedEvents) {
        setEvents(cachedEvents);
        setIsFromCache(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedEvents();
  }, [fetchFeaturedEvents]);

  return { events, loading, isFromCache, refresh: fetchFeaturedEvents };
}

export function useOfflineTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      const isOnline = cacheService.isConnected();

      if (isOnline) {
        const response = await api.get('/api/tickets');
        const data = Array.isArray(response.data) ? response.data : response.data?.value || [];
        setTickets(data);
        setIsFromCache(false);
        await cacheService.cacheUserTickets(user.id.toString(), data);
      } else {
        const cachedTickets = await cacheService.getCachedUserTickets(user.id.toString());
        if (cachedTickets) {
          setTickets(cachedTickets);
          setIsFromCache(true);
        }
      }
    } catch (error) {
      logger.error('Fetch tickets error:', error);
      if (user?.id) {
        const cachedTickets = await cacheService.getCachedUserTickets(user.id.toString());
        if (cachedTickets) {
          setTickets(cachedTickets);
          setIsFromCache(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return { tickets, loading, isFromCache, refresh: fetchTickets };
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    cacheService.checkConnection().then(setIsOnline);

    const unsubscribe = cacheService.onConnectionChange(setIsOnline);
    return unsubscribe;
  }, []);

  return isOnline;
}
