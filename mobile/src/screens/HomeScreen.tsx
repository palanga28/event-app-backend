import React, { useState, useEffect, useRef } from 'react';
import logger from '../lib/logger';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin, Users, Search, Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { EventCardSkeleton } from '../components/SkeletonLoader';
import { FavoriteButton } from '../components/FavoriteButton';
import { EventCarousel } from '../components/EventCarousel';
import { StoriesBar } from '../components/StoriesBar';
import { AnimatedImage } from '../components/AnimatedImage';
import { useAuth } from '../contexts/AuthContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { cacheService } from '../services/cacheService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type Event = {
  id: number;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  cover_image: string;
  images?: string[];
  organizer: {
    id: number;
    name: string;
    avatar_url?: string;
  };
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [imageIndexes, setImageIndexes] = useState<{ [key: number]: number }>({});
  const [isOffline, setIsOffline] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const EVENTS_PER_PAGE = 12;

  useEffect(() => {
    loadEvents();
    loadUnreadNotificationsCount();
  }, []);

  // Recharger le compteur quand l'écran redevient actif
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUnreadNotificationsCount();
    });
    return unsubscribe;
  }, [navigation]);

  async function loadUnreadNotificationsCount() {
    try {
      const response = await api.get('/api/notifications/unread-count');
      setUnreadNotifications(response.data.unread || response.data.count || 0);
    } catch (error) {
      // Silently fail - not critical
    }
  }

  // Auto-rotate images for all events every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndexes((prev) => {
        const newIndexes = { ...prev };
        events.forEach((event) => {
          if (event.images && event.images.length > 1) {
            const currentIndex = prev[event.id] || 0;
            newIndexes[event.id] = (currentIndex + 1) % event.images.length;
          }
        });
        return newIndexes;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [events]);

  async function loadEvents(page: number = currentPage) {
    try {
      setError(null);
      const isOnline = await cacheService.checkConnection();
      setIsOffline(!isOnline);

      if (isOnline) {
        // Mode en ligne : récupérer depuis l'API
        const offset = (page - 1) * EVENTS_PER_PAGE;
        const response = await api.get(`/api/events?limit=${EVENTS_PER_PAGE}&offset=${offset}`);
        
        const eventsData = Array.isArray(response.data) ? response.data : (response.data.events || []);
        
        const parsedEvents = eventsData.map((event: Event) => {
          if (event.images && typeof event.images === 'string') {
            try {
              event.images = JSON.parse(event.images);
            } catch (e) {
              event.images = [];
            }
          }
          if (!Array.isArray(event.images)) {
            event.images = [];
          }
          return event;
        });
        
        setEvents(parsedEvents);
        setIsFromCache(false);

        // Mettre en cache pour le mode hors ligne
        await cacheService.cacheEvents(parsedEvents);

        if (page === 1) {
          try {
            const countRes = await api.get('/api/events?limit=1000');
            const allEvents = Array.isArray(countRes.data) ? countRes.data : [];
            setTotalEvents(allEvents.length);
          } catch (e) {
            logger.log('Count events failed');
          }
        }

        if (user) {
          try {
            const favRes = await api.get('/api/favorites');
            const favIds = favRes.data.map((f: any) => f.event_id);
            setFavoriteIds(favIds);
            await cacheService.cacheUserFavorites(user.id.toString(), favRes.data);
          } catch (e) {
            logger.log('Favorites load failed');
          }
        }
      } else {
        // Mode hors ligne : récupérer depuis le cache
        const cachedEvents = await cacheService.getCachedEvents();
        if (cachedEvents && cachedEvents.length > 0) {
          setEvents(cachedEvents);
          setIsFromCache(true);
          setTotalEvents(cachedEvents.length);
        } else {
          setError('Aucune donnée en cache. Connectez-vous à Internet.');
        }

        if (user) {
          const cachedFavorites = await cacheService.getCachedUserFavorites(user.id.toString());
          if (cachedFavorites) {
            const favIds = cachedFavorites.map((f: any) => f.event_id);
            setFavoriteIds(favIds);
          }
        }
      }
    } catch (err: any) {
      // En cas d'erreur, essayer le cache
      const cachedEvents = await cacheService.getCachedEvents();
      if (cachedEvents && cachedEvents.length > 0) {
        setEvents(cachedEvents);
        setIsFromCache(true);
        setIsOffline(true);
      } else {
        setError(err?.message || 'Erreur de chargement');
      }
      logger.error('Load events error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function toggleFavorite(eventId: number) {
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    const isFavorite = favoriteIds.includes(eventId);

    // Optimistic update
    if (isFavorite) {
      setFavoriteIds(favoriteIds.filter(id => id !== eventId));
    } else {
      setFavoriteIds([...favoriteIds, eventId]);
    }

    try {
      if (isFavorite) {
        await api.delete(`/api/events/${eventId}/favorite`);
      } else {
        await api.post(`/api/events/${eventId}/favorite`);
      }
    } catch (err) {
      // Rollback en cas d'erreur
      if (isFavorite) {
        setFavoriteIds([...favoriteIds, eventId]);
      } else {
        setFavoriteIds(favoriteIds.filter(id => id !== eventId));
      }
      logger.error('Toggle favorite error:', err);
    }
  }

  function goToNextPage() {
    const totalPages = Math.ceil(totalEvents / EVENTS_PER_PAGE);
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      setLoading(true);
      loadEvents(nextPage);
    }
  }

  function goToPreviousPage() {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      setLoading(true);
      loadEvents(prevPage);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    setCurrentPage(1);
    loadEvents(1);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  }

  function renderEventCard({ item }: { item: Event }) {
    const isFavorite = favoriteIds.includes(item.id);
    const currentImageIndex = imageIndexes[item.id] || 0;
    const imageToShow = item.images && item.images.length > 0 
      ? item.images[currentImageIndex] 
      : item.cover_image;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
        activeOpacity={0.8}
      >
        <AnimatedImage
          uri={imageToShow || 'https://via.placeholder.com/300x200'}
          style={styles.cardImage}
          imageIndex={currentImageIndex}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.cardGradient}
        />
        
        {/* Image indicators */}
        {item.images && item.images.length > 1 && (
          <View style={styles.imageIndicators}>
            {item.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentImageIndex && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        )}
        
        {/* Bouton favori */}
        <View style={styles.favoriteButtonContainer}>
          <FavoriteButton
            isFavorite={isFavorite}
            onPress={() => toggleFavorite(item.id)}
            size={20}
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.cardInfo}>
            <Calendar size={12} color={colors.text.secondary} />
            <Text style={styles.cardInfoText}>{formatDate(item.start_date)}</Text>
          </View>
          <View style={styles.cardInfo}>
            <MapPin size={12} color={colors.text.secondary} />
            <Text style={styles.cardInfoText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={colors.gradients.dark as [string, string]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Événements</Text>
              <Text style={styles.headerSubtitle}>Découvre les événements près de toi</Text>
            </View>
          </View>
        </View>
        <View style={[styles.list, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }]}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadEvents()}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradients.dark as [string, string]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Bannière mode hors ligne */}
      <OfflineBanner isFromCache={isFromCache} />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Événements</Text>
            <Text style={styles.headerSubtitle}>Découvre les événements près de toi</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Bell size={20} color={colors.text.primary} />
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('SearchEvents')}
            >
              <Search size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={events}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.purple}
          />
        }
        ListHeaderComponent={
          <>
            <StoriesBar />
            {events.length > 0 ? (
              <EventCarousel
                events={events}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
              />
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun événement disponible</Text>
          </View>
        }
        ListFooterComponent={
          events.length > 0 ? (
            <View style={styles.paginationContainer}>
              <View style={styles.paginationInfo}>
                <Text style={styles.paginationText}>
                  Page {currentPage} sur {Math.ceil(totalEvents / EVENTS_PER_PAGE)}
                </Text>
                <Text style={styles.paginationSubtext}>
                  {events.length} événements affichés sur {totalEvents}
                </Text>
              </View>
              
              <View style={styles.paginationButtons}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                    ← Précédent
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    currentPage >= Math.ceil(totalEvents / EVENTS_PER_PAGE) && styles.paginationButtonDisabled,
                  ]}
                  onPress={goToNextPage}
                  disabled={currentPage >= Math.ceil(totalEvents / EVENTS_PER_PAGE)}
                >
                  <Text
                    style={[
                      styles.paginationButtonText,
                      currentPage >= Math.ceil(totalEvents / EVENTS_PER_PAGE) && styles.paginationButtonTextDisabled,
                    ]}
                  >
                    Suivant →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.dark,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  searchButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.background.card,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  favoriteButtonContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorActive: {
    backgroundColor: colors.primary.purple,
    width: 18,
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardInfoText: {
    fontSize: 11,
    color: colors.text.secondary,
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 16,
  },
  errorText: {
    color: colors.status.error,
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  paginationContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  paginationInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  paginationText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  paginationSubtext: {
    fontSize: 12,
    color: colors.text.muted,
  },
  paginationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  paginationButton: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.primary.purple,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 140,
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    borderColor: colors.border.light,
    opacity: 0.5,
  },
  paginationButtonText: {
    color: colors.primary.purple,
    fontSize: 14,
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    color: colors.text.muted,
  },
});
