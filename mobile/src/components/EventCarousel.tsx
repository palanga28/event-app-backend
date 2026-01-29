import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, ChevronLeft, ChevronRight, MapPin, Calendar, BadgeCheck } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const CAROUSEL_WIDTH = width;

type CarouselEvent = {
  id: number;
  title: string;
  start_date: string;
  location: string | null;
  cover_image: string | null;
  images?: string[] | null;
  featured?: boolean;
  in_carousel?: boolean;
  organizer?: {
    id: number;
    name: string;
    is_verified_organizer?: boolean;
  } | null;
};

type Props = {
  events: CarouselEvent[];
  favoriteIds: number[];
  onToggleFavorite: (eventId: number) => void;
};

export function EventCarousel({ events, favoriteIds, onToggleFavorite }: Props) {
  const navigation = useNavigation<any>();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const featuredEvents = events.filter((e) => e.featured || e.in_carousel);

  useEffect(() => {
    if (featuredEvents.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % featuredEvents.length;
        scrollViewRef.current?.scrollTo({
          x: next * CAROUSEL_WIDTH,
          animated: true,
        });
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [featuredEvents.length]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CAROUSEL_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const goToSlide = (index: number) => {
    setActiveIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * CAROUSEL_WIDTH,
      animated: true,
    });
  };

  const goToPrevious = () => {
    const prev = (activeIndex - 1 + featuredEvents.length) % featuredEvents.length;
    goToSlide(prev);
  };

  const goToNext = () => {
    const next = (activeIndex + 1) % featuredEvents.length;
    goToSlide(next);
  };

  if (featuredEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>⭐</Text>
        <Text style={styles.emptyTitle}>Aucun événement en vedette</Text>
        <Text style={styles.emptyText}>
          Les événements vedettes apparaîtront ici
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.starIcon}>⭐</Text>
          <View>
            <Text style={styles.headerTitle}>Événements vedettes</Text>
            <Text style={styles.headerSubtitle}>
              {activeIndex + 1} / {featuredEvents.length}
            </Text>
          </View>
        </View>

        {featuredEvents.length > 1 && (
          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.navButton} onPress={goToPrevious}>
              <ChevronLeft size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={goToNext}>
              <ChevronRight size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {featuredEvents.map((event) => {
          const isFavorite = favoriteIds.includes(event.id);
          const images = Array.isArray(event.images) ? event.images.filter(Boolean) : [];
          const heroImage = images.length > 0 ? images[0] : event.cover_image;

          return (
            <View key={event.id} style={styles.slide}>
              <TouchableOpacity
                style={styles.slideInner}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                activeOpacity={0.95}
              >
                {/* Background Image */}
                <Image
                  source={{ uri: heroImage || 'https://via.placeholder.com/400x500' }}
                  style={styles.backgroundImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
                  style={styles.gradient}
                />

              {/* Content */}
              <View style={styles.content}>
                {/* Title & Favorite */}
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={2}>
                    {event.title}
                  </Text>
                  <TouchableOpacity
                    style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
                    onPress={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(event.id);
                    }}
                  >
                    <Heart
                      size={18}
                      color={isFavorite ? colors.text.primary : colors.text.primary}
                      fill={isFavorite ? colors.primary.pink : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Location */}
                {event.location && (
                  <View style={styles.infoRow}>
                    <MapPin size={14} color={colors.text.primary} />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {event.location}
                    </Text>
                  </View>
                )}

                {/* Date */}
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.text.primary} />
                  <Text style={styles.infoText}>
                    {new Date(event.start_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {/* Organizer */}
                {event.organizer && (
                  <View style={styles.organizerRow}>
                    <View style={styles.organizerAvatar}>
                      <Text style={styles.organizerAvatarText}>
                        {event.organizer.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <View style={styles.organizerNameRow}>
                        <Text style={styles.organizerName}>{event.organizer.name}</Text>
                        {event.organizer.is_verified_organizer && (
                          <BadgeCheck size={14} color="#ffffff" fill="#3b82f6" />
                        )}
                      </View>
                      <Text style={styles.organizerLabel}>Organisateur</Text>
                    </View>
                  </View>
                )}

                {/* Badge */}
                <View style={styles.badge}>
                  <LinearGradient
                    colors={colors.gradients.primary as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.badgeGradient}
                  >
                    <Text style={styles.badgeText}>⭐ Événement vedette</Text>
                  </LinearGradient>
                </View>
              </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Indicators */}
      {featuredEvents.length > 1 && (
        <View style={styles.indicators}>
          {featuredEvents.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => goToSlide(index)}
              style={[
                styles.indicator,
                index === activeIndex && styles.indicatorActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  starIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.text.muted,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    height: 320,
  },
  slide: {
    width: CAROUSEL_WIDTH,
    height: 320,
    paddingHorizontal: 16,
  },
  slideInner: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    lineHeight: 26,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButtonActive: {
    backgroundColor: colors.primary.pink,
    borderColor: colors.primary.pink,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.text.primary,
    flex: 1,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 10,
  },
  organizerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  organizerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  organizerName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  organizerLabel: {
    fontSize: 10,
    color: colors.text.muted,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  indicatorActive: {
    width: 24,
    backgroundColor: colors.primary.purple,
  },
  emptyContainer: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
