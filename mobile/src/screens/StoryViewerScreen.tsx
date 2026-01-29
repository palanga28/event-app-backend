import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  StatusBar,
  Animated,
  ActivityIndicator,
  GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../lib/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 secondes par story
const LONG_PRESS_DELAY = 150; // Délai pour détecter un appui long

type Story = {
  id: number;
  user_id: number;
  image_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  user: {
    id: number;
    name: string;
    avatar_url: string | null;
  } | null;
};

type StoryViewerScreenProps = {
  visible: boolean;
  story: Story | null;
  stories: Story[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onStoryViewed?: (storyId: number) => void;
};

export function StoryViewerScreen({ visible, story, stories, currentIndex, onClose, onNext, onPrev, onStoryViewed }: StoryViewerScreenProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Utiliser Animated.Value pour la progression (plus fluide)
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const viewedStoriesRef = useRef<Set<number>>(new Set());
  
  // Pour la gestion des taps
  const touchStartTime = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressing = useRef<boolean>(false);

  // Précharger les images adjacentes
  const preloadImages = useCallback(() => {
    // Précharger la suivante
    if (currentIndex < stories.length - 1) {
      const nextStory = stories[currentIndex + 1];
      if (nextStory?.image_url) {
        Image.prefetch(nextStory.image_url).catch(() => {});
      }
    }
    // Précharger la précédente aussi
    if (currentIndex > 0) {
      const prevStory = stories[currentIndex - 1];
      if (prevStory?.image_url) {
        Image.prefetch(prevStory.image_url).catch(() => {});
      }
    }
  }, [currentIndex, stories]);

  // Vérifier si la story est expirée
  const isStoryExpired = useCallback((storyToCheck: Story | null) => {
    if (!storyToCheck?.expires_at) return false;
    return new Date(storyToCheck.expires_at) < new Date();
  }, []);

  // Démarrer l'animation de progression
  const startProgressAnimation = useCallback(() => {
    if (progressAnimation.current) {
      progressAnimation.current.stop();
    }
    
    // Calculer le temps restant basé sur la progression actuelle
    const currentProgress = (progressAnim as any)._value || 0;
    const remainingTime = STORY_DURATION * (1 - currentProgress);
    
    progressAnimation.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: remainingTime,
      useNativeDriver: false, // width ne supporte pas native driver
    });
    
    progressAnimation.current.start(({ finished }) => {
      if (finished) {
        // Story terminée, passer à la suivante
        if (currentIndex < stories.length - 1) {
          onNext();
        } else {
          onClose();
        }
      }
    });
  }, [progressAnim, currentIndex, stories.length, onNext, onClose]);

  // Mettre en pause l'animation
  const pauseProgressAnimation = useCallback(() => {
    if (progressAnimation.current) {
      progressAnimation.current.stop();
    }
  }, []);

  // Reset quand on change de story - utiliser story.id comme dépendance unique
  const storyId = story?.id;
  useEffect(() => {
    if (!storyId) return;
    
    progressAnim.setValue(0);
    setImageLoaded(false);
    preloadImages();
    
    // Timeout de secours si onLoad ne se déclenche pas (image en cache)
    const fallbackTimer = setTimeout(() => {
      setImageLoaded(true);
    }, 500);
    
    return () => clearTimeout(fallbackTimer);
  }, [storyId]); // Seulement storyId comme dépendance

  // Gérer la visibilité
  useEffect(() => {
    if (!visible) {
      progressAnim.setValue(0);
      setImageLoaded(false);
      pauseProgressAnimation();
    }
  }, [visible]);

  // Marquer la story comme vue et vérifier expiration
  useEffect(() => {
    if (!visible || !story) return;

    // Vérifier si la story est expirée
    if (isStoryExpired(story)) {
      if (currentIndex < stories.length - 1) {
        onNext();
      } else {
        onClose();
      }
      return;
    }

    // Marquer la story comme vue (une seule fois par story)
    if (!viewedStoriesRef.current.has(story.id)) {
      viewedStoriesRef.current.add(story.id);
      markStoryAsViewed(story.id);
    }
  }, [storyId, visible]); // Dépendances minimales

  // Reset viewed stories when viewer closes + cleanup timers
  useEffect(() => {
    if (!visible) {
      viewedStoriesRef.current.clear();
      // Nettoyer le timer d'appui long
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    
    // Cleanup au démontage du composant
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };
  }, [visible]);

  // Démarrer/arrêter l'animation selon l'état
  useEffect(() => {
    if (!visible || !story || !imageLoaded) {
      pauseProgressAnimation();
      return;
    }

    if (isPaused) {
      pauseProgressAnimation();
    } else {
      startProgressAnimation();
    }
  }, [visible, story, imageLoaded, isPaused, startProgressAnimation, pauseProgressAnimation]);

  async function markStoryAsViewed(storyId: number) {
    try {
      await api.post(`/api/stories/${storyId}/view`);
      onStoryViewed?.(storyId);
    } catch (err) {
      // Silently fail
    }
  }

  // Gestion unifiée des touches - plus simple et plus fiable
  const handleTouchStart = useCallback((e: GestureResponderEvent) => {
    touchStartTime.current = Date.now();
    touchStartX.current = e.nativeEvent.pageX;
    isLongPressing.current = false;
    
    // Timer pour détecter l'appui long
    longPressTimer.current = setTimeout(() => {
      isLongPressing.current = true;
      setIsPaused(true);
    }, LONG_PRESS_DELAY);
  }, []);

  const handleTouchEnd = useCallback((e: GestureResponderEvent) => {
    // Annuler le timer d'appui long
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    const touchDuration = Date.now() - touchStartTime.current;
    const touchEndX = e.nativeEvent.pageX;
    
    // Si c'était un appui long, juste reprendre
    if (isLongPressing.current) {
      setIsPaused(false);
      isLongPressing.current = false;
      return;
    }
    
    // Tap court = navigation
    if (touchDuration < LONG_PRESS_DELAY) {
      const isLeftSide = touchStartX.current < SCREEN_WIDTH * 0.3;
      if (isLeftSide) {
        onPrev();
      } else {
        onNext();
      }
    }
    
    setIsPaused(false);
  }, [onPrev, onNext]);

  const handleTouchCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsPaused(false);
    isLongPressing.current = false;
  }, []);

  // Calculer le temps écoulé
  const timeAgo = useMemo(() => {
    if (!story?.created_at) return '';
    const date = new Date(story.created_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m`;
    }
    return `${diffHours}h`;
  }, [story?.created_at]);

  // Interpoler la largeur de la barre de progression
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!story) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View 
        style={styles.container}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {/* Image de la story - key unique pour forcer le rechargement */}
        <Image
          key={`story-image-${story.id}-${currentIndex}`}
          source={{ uri: story.image_url, cache: 'reload' }}
          style={styles.storyImage}
          resizeMode="cover"
          onLoadStart={() => setImageLoaded(false)}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
        
        {/* Loading indicator */}
        {!imageLoaded && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        
        {/* Gradient overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.3)']}
          locations={[0, 0.2, 0.8, 1]}
          style={styles.gradient}
          pointerEvents="none"
        />

        {/* Progress bars */}
        <View style={styles.progressContainer} pointerEvents="none">
          <View style={styles.progressBarsRow}>
            {stories.map((s, idx) => (
              <View key={s.id} style={styles.progressBar}>
                {idx < currentIndex ? (
                  <View style={[styles.progressFill, { width: '100%' }]} />
                ) : idx === currentIndex ? (
                  <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* Header */}
        <View style={styles.header} pointerEvents="box-none">
          <View style={styles.userInfo}>
            {story.user?.avatar_url ? (
              <Image
                source={{ uri: story.user.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {story.user?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{story.user?.name || 'Anonyme'}</Text>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Indicateur de pause */}
        {isPaused && imageLoaded && (
          <View style={styles.pauseIndicator} pointerEvents="none">
            <Text style={styles.pauseText}>En pause</Text>
          </View>
        )}

        {/* Caption */}
        {story.caption && (
          <View style={styles.captionContainer} pointerEvents="none">
            <Text style={styles.caption}>{story.caption}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  progressContainer: {
    position: 'absolute',
    top: 50,
    left: 8,
    right: 8,
  },
  progressBarsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },
  header: {
    position: 'absolute',
    top: 58,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarPlaceholderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  userDetails: {
    marginLeft: 10,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  timeAgo: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -15 }],
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pauseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 50,
    left: 16,
    right: 16,
  },
  caption: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    lineHeight: 22,
  },
});
