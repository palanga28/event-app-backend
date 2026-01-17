import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  StatusBar,
  Pressable,
  PanResponder,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../lib/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100; // Distance minimale pour déclencher un swipe

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
  const [progress, setProgress] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartTime = useRef<number>(0);
  const isLongPress = useRef<boolean>(false);
  const viewedStoriesRef = useRef<Set<number>>(new Set());
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Gesture handler pour swipe bas (fermer) et swipe horizontal (changer user)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Activer le pan si mouvement vertical > 10 ou horizontal > 10
        return Math.abs(gestureState.dy) > 10 || Math.abs(gestureState.dx) > 50;
      },
      onPanResponderGrant: () => {
        setIsPaused(true);
      },
      onPanResponderMove: (_, gestureState) => {
        // Swipe vers le bas uniquement
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
          opacity.setValue(1 - gestureState.dy / 400);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsPaused(false);
        
        // Swipe bas -> fermer
        if (gestureState.dy > SWIPE_THRESHOLD) {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onClose();
            translateY.setValue(0);
            opacity.setValue(1);
          });
          return;
        }
        
        // Reset position si pas assez de swipe
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        Animated.spring(opacity, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Reset progress et image quand on change de story
  useEffect(() => {
    setProgress(0);
    setImageLoaded(false);
  }, [currentIndex]);

  useEffect(() => {
    if (!visible || !story) {
      setProgress(0);
      setImageLoaded(false);
      return;
    }

    // Marquer la story comme vue si pas encore fait
    if (!viewedStoriesRef.current.has(story.id)) {
      viewedStoriesRef.current.add(story.id);
      markStoryAsViewed(story.id);
    }
  }, [visible, story]);

  // Reset viewed stories when viewer closes
  useEffect(() => {
    if (!visible) {
      viewedStoriesRef.current.clear();
    }
  }, [visible]);

  async function markStoryAsViewed(storyId: number) {
    try {
      await api.post(`/api/stories/${storyId}/view`);
      onStoryViewed?.(storyId);
    } catch (err) {
      // Silently fail - route may not exist on server yet
      // Will work once backend is deployed with new routes
    }
  }

  useEffect(() => {
    if (!visible || !story || !imageLoaded || isPaused) {
      return;
    }

    const duration = 5000; // 5 secondes par story (comme Instagram)
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            if (currentIndex < stories.length - 1) {
              onNext();
            } else {
              onClose();
            }
          }, 0);
          return 100;
        }
        return newProgress;
      });
    }, interval);

    timerRef.current = timer;
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible, story, imageLoaded, isPaused, currentIndex, stories.length, onNext, onClose]);

  function handlePressInLeft() {
    pressStartTime.current = Date.now();
    isLongPress.current = false;
    setIsPaused(true);
  }

  function handlePressOutLeft() {
    const pressDuration = Date.now() - pressStartTime.current;
    setIsPaused(false);
    
    // Si appui court (< 200ms), c'est un tap pour naviguer
    if (pressDuration < 200) {
      onPrev();
    }
    // Sinon c'était une pause, on ne fait rien (la story continue)
  }

  function handlePressInRight() {
    pressStartTime.current = Date.now();
    isLongPress.current = false;
    setIsPaused(true);
  }

  function handlePressOutRight() {
    const pressDuration = Date.now() - pressStartTime.current;
    setIsPaused(false);
    
    // Si appui court (< 200ms), c'est un tap pour naviguer
    if (pressDuration < 200) {
      onNext();
    }
    // Sinon c'était une pause, on ne fait rien (la story continue)
  }

  if (!story) {
    return null;
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m`;
    }
    return `${diffHours}h`;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <Animated.View 
        style={[
          styles.container, 
          { 
            transform: [{ translateY }],
            opacity,
          }
        ]}
        {...panResponder.panHandlers}
      >
        {/* Zone tactile gauche (story précédente) */}
        <Pressable
          style={styles.touchLeft}
          onPressIn={handlePressInLeft}
          onPressOut={handlePressOutLeft}
        />
        {/* Zone tactile droite (story suivante) */}
        <Pressable
          style={styles.touchRight}
          onPressIn={handlePressInRight}
          onPressOut={handlePressOutRight}
        />
        <Image
          source={{ uri: story.image_url }}
          style={styles.storyImage}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)} // Continuer même si erreur
        />
        
        {/* Loading indicator */}
        {!imageLoaded && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        
        {/* Gradient overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.3)']}
          style={styles.gradient}
        />

        {/* Progress bars - une par story de l'utilisateur */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarsRow}>
            {stories.map((s, idx) => (
              <View key={s.id} style={[styles.progressBar, { flex: 1 }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                    }
                  ]} 
                />
              </View>
            ))}
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
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
              <Text style={styles.timeAgo}>{formatTimeAgo(story.created_at)}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {story.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>{story.caption}</Text>
          </View>
        )}

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyImage: {
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
    zIndex: 10,
  },
  progressBarsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.text.primary,
    borderRadius: 2,
  },
  touchLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '30%',
    zIndex: 5,
  },
  touchRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '70%',
    zIndex: 5,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.text.primary,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.text.primary,
  },
  avatarPlaceholderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  timeAgo: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  caption: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
