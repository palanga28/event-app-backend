import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { StoryViewerScreen } from '../screens/StoryViewerScreen';

type Story = {
  id: number;
  user_id: number;
  image_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  viewed: boolean;
  user: {
    id: number;
    name: string;
    avatar_url: string | null;
  } | null;
};

type UserStories = {
  userId: number;
  user: Story['user'];
  stories: Story[]; // Triées par date (ancienne -> récente)
  latestStory: Story;
  unseenCount: number; // Nombre de stories non vues
};

export function StoriesBar() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [userStoriesGroups, setUserStoriesGroups] = useState<UserStories[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  async function loadStories() {
    try {
      if (!user) {
        setUserStoriesGroups([]);
        setLoading(false);
        return;
      }

      const response = await api.get('/api/stories/visible');
      const storiesData = Array.isArray(response.data) ? response.data : [];
      
      // Grouper par utilisateur et garder TOUTES les stories
      const storiesByUser = new Map<number, Story[]>();
      storiesData.forEach((story: Story) => {
        if (story.user_id) {
          const existing = storiesByUser.get(story.user_id) || [];
          existing.push(story);
          storiesByUser.set(story.user_id, existing);
        }
      });

      // Créer les groupes d'utilisateurs avec stories triées (ancienne -> récente)
      const groups: UserStories[] = [];
      storiesByUser.forEach((userStories, userId) => {
        // Trier par date croissante (ancienne en premier)
        userStories.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        const latestStory = userStories[userStories.length - 1];
        const unseenCount = userStories.filter(s => !s.viewed).length;
        groups.push({
          userId,
          user: latestStory.user,
          stories: userStories,
          latestStory,
          unseenCount,
        });
      });

      // Trier les groupes:
      // 1. Ma story en premier
      // 2. Stories non vues d'abord
      // 3. Par date de la plus récente story
      const currentUserId = user?.id;
      groups.sort((a, b) => {
        // Ma story toujours en premier
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        
        // Non vues avant vues
        const aHasUnseen = a.unseenCount > 0;
        const bHasUnseen = b.unseenCount > 0;
        if (aHasUnseen && !bHasUnseen) return -1;
        if (!aHasUnseen && bHasUnseen) return 1;
        
        // Par date de la plus récente
        return new Date(b.latestStory.created_at).getTime() - new Date(a.latestStory.created_at).getTime();
      });

      setUserStoriesGroups(groups);
    } catch (err) {
      console.error('Load stories error:', err);
      setUserStoriesGroups([]);
    } finally {
      setLoading(false);
    }
  }

  function handleAddStory() {
    navigation.navigate('Main', { screen: 'ProfileTab' });
  }

  function handleViewStory(userGroup: UserStories) {
    const index = userStoriesGroups.findIndex(g => g.userId === userGroup.userId);
    setCurrentUserIndex(index >= 0 ? index : 0);
    setCurrentStoryIndex(0); // Commencer par la première story (la plus ancienne)
    setViewerVisible(true);
  }

  function handleCloseViewer() {
    setViewerVisible(false);
    setCurrentUserIndex(0);
    setCurrentStoryIndex(0);
  }

  function handleStoryViewed(storyId: number) {
    // Mettre à jour localement le statut "viewed" et le compteur
    setUserStoriesGroups(prevGroups => 
      prevGroups.map(group => {
        const updatedStories = group.stories.map(s => 
          s.id === storyId ? { ...s, viewed: true } : s
        );
        const unseenCount = updatedStories.filter(s => !s.viewed).length;
        return {
          ...group,
          stories: updatedStories,
          unseenCount,
        };
      })
    );
  }

  function handleNextStory() {
    const currentGroup = userStoriesGroups[currentUserIndex];
    if (!currentGroup) {
      handleCloseViewer();
      return;
    }

    // S'il reste des stories pour cet utilisateur
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } 
    // Sinon, passer à l'utilisateur suivant
    else if (currentUserIndex < userStoriesGroups.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentStoryIndex(0);
    } 
    // Plus rien à afficher
    else {
      handleCloseViewer();
    }
  }

  function handlePrevStory() {
    // S'il y a des stories précédentes pour cet utilisateur
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
    // Sinon, revenir à l'utilisateur précédent
    else if (currentUserIndex > 0) {
      const prevGroup = userStoriesGroups[currentUserIndex - 1];
      setCurrentUserIndex(currentUserIndex - 1);
      setCurrentStoryIndex(prevGroup.stories.length - 1);
    }
  }

  // Obtenir la story actuelle
  const currentGroup = userStoriesGroups[currentUserIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex] || null;
  const totalStoriesForUser = currentGroup?.stories.length || 0;

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Bouton Ajouter Story */}
        <TouchableOpacity style={styles.addStoryButton} onPress={handleAddStory}>
          <LinearGradient
            colors={[colors.primary.purple, colors.primary.pink]}
            style={styles.addStoryGradient}
          >
            <Plus size={24} color={colors.text.primary} />
          </LinearGradient>
          <Text style={styles.storyLabel} numberOfLines={1}>
            Ajouter
          </Text>
        </TouchableOpacity>

        {/* Stories des utilisateurs */}
        {userStoriesGroups.map((group) => (
          <TouchableOpacity
            key={group.userId}
            style={styles.storyItem}
            onPress={() => handleViewStory(group)}
          >
            {/* Cercle coloré si non vu, gris si tout vu */}
            {group.unseenCount > 0 ? (
              <LinearGradient
                colors={[colors.primary.purple, colors.primary.pink]}
                style={styles.storyGradientBorder}
              >
              <View style={styles.storyImageContainer}>
                {group.user?.avatar_url ? (
                  <Image
                    source={{ uri: group.user.avatar_url }}
                    style={styles.storyImage}
                  />
                ) : (
                  <View style={styles.storyImagePlaceholder}>
                    <Text style={styles.storyImagePlaceholderText}>
                      {group.user?.name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
            ) : (
              <View style={styles.storySeenBorder}>
              <View style={styles.storyImageContainer}>
                {group.user?.avatar_url ? (
                  <Image
                    source={{ uri: group.user.avatar_url }}
                    style={styles.storyImage}
                  />
                ) : (
                  <View style={styles.storyImagePlaceholder}>
                    <Text style={styles.storyImagePlaceholderText}>
                      {group.user?.name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
              </View>
              </View>
            )}
            <Text style={styles.storyLabel} numberOfLines={1}>
              {group.userId === user?.id ? 'Ma story' : (group.user?.name || 'Anonyme')}
            </Text>
            {group.unseenCount > 0 && (
              <View style={styles.storyCount}>
                <Text style={styles.storyCountText}>{group.unseenCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Story Viewer */}
      <StoryViewerScreen
        visible={viewerVisible}
        story={currentStory}
        stories={currentGroup?.stories || []}
        currentIndex={currentStoryIndex}
        totalStories={totalStoriesForUser}
        onClose={handleCloseViewer}
        onNext={handleNextStory}
        onPrev={handlePrevStory}
        onStoryViewed={handleStoryViewed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    minHeight: 100,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  addStoryButton: {
    alignItems: 'center',
    width: 70,
  },
  addStoryGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  storyItem: {
    alignItems: 'center',
    width: 70,
  },
  storyGradientBorder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    marginBottom: 4,
  },
  storyImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background.card,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.background.dark,
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.card,
  },
  storyImagePlaceholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.muted,
  },
  storyLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 70,
  },
  storyCount: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary.purple,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.dark,
  },
  storyCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  storySeenBorder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Cercle gris pour stories vues
  },
});
