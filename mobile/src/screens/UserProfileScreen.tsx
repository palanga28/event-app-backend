import React, { useState, useEffect } from 'react';
import logger from '../lib/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, UserPlus, UserMinus, Calendar, MapPin, Mail } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';

type PublicUser = {
  id: number;
  name: string;
  email?: string;
  avatar_url?: string | null;
  bio?: string | null;
};

type Event = {
  id: number;
  title: string;
  description: string;
  cover_image?: string;
  start_date: string;
  location?: string;
  status: string;
};

type FollowResponse = {
  followerIds: number[];
  followingIds: number[];
};

export default function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const userId = route.params?.userId;

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<number[]>([]);
  const [followerIds, setFollowerIds] = useState<number[]>([]);
  const [profileFollowers, setProfileFollowers] = useState(0);
  const [profileFollowing, setProfileFollowing] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const isMe = user && userId && user.id === userId;
  const isFollowing = user && userId ? followingIds.includes(userId) : false;

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    if (!userId) {
      setError('ID utilisateur invalide');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requests: Promise<any>[] = [
        api.get(`/api/users/${userId}/public`),
        api.get('/api/events'),
      ];

      if (user) {
        requests.push(api.get<FollowResponse>('/api/follows/mine'));
      }

      const results = await Promise.all(requests);
      const profileRes = results[0];
      const eventsRes = results[1];
      const followRes = results[2];

      setProfile(profileRes.data);

      // Filtrer les événements de cet utilisateur
      const rawEvents = eventsRes.data;
      const allEvents = Array.isArray(rawEvents) ? rawEvents : (rawEvents?.value || []);
      const userEvents = allEvents.filter(
        (e: any) => e.organizer_id === userId || e.organizer?.id === userId
      );
      setEvents(userEvents.slice(0, 6));

      if (followRes) {
        setFollowingIds(followRes.data.followingIds || []);
        setFollowerIds(followRes.data.followerIds || []);
      }

      // Charger les stats de followers/following
      const statsRes = await api.get(`/api/users/${userId}/follow-stats`);
      setProfileFollowers(statsRes.data.followers || 0);
      setProfileFollowing(statsRes.data.following || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur de chargement');
      logger.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowToggle() {
    if (!user || !userId) return;

    setActionLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/api/follows/${userId}`);
        setFollowingIds(followingIds.filter((id) => id !== userId));
        setProfileFollowers(profileFollowers - 1);
      } else {
        await api.post(`/api/follows/${userId}`);
        setFollowingIds([...followingIds, userId]);
        setProfileFollowers(profileFollowers + 1);
      }
    } catch (err: any) {
      logger.error('Follow toggle error:', err);
    } finally {
      setActionLoading(false);
    }
  }

  function renderEventCard({ item }: { item: Event }) {
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
      >
        {item.cover_image && (
          <Image source={{ uri: item.cover_image }} style={styles.eventImage} resizeMode="cover" />
        )}
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.location && (
            <View style={styles.eventInfo}>
              <MapPin size={12} color={colors.text.muted} />
              <Text style={styles.eventInfoText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
          <View style={styles.eventInfo}>
            <Calendar size={12} color={colors.text.muted} />
            <Text style={styles.eventInfoText}>
              {new Date(item.start_date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={colors.gradients.dark as [string, string]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.primary.purple} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={colors.gradients.dark as [string, string]} style={StyleSheet.absoluteFill} />
        <Text style={styles.errorText}>{error || 'Utilisateur non trouvé'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.gradients.dark as [string, string]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>{profile.name}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{events.length}</Text>
              <Text style={styles.statLabel}>Événements</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileFollowers}</Text>
              <Text style={styles.statLabel}>Abonnés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileFollowing}</Text>
              <Text style={styles.statLabel}>Abonnements</Text>
            </View>
          </View>

          {/* Actions */}
          {!isMe && user && (
            <TouchableOpacity
              style={styles.followButton}
              onPress={handleFollowToggle}
              disabled={actionLoading}
            >
              <LinearGradient
                colors={
                  isFollowing
                    ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                    : (colors.gradients.primary as [string, string])
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.followButtonGradient}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                  <>
                    {isFollowing ? (
                      <UserMinus size={18} color={colors.text.primary} />
                    ) : (
                      <UserPlus size={18} color={colors.text.primary} />
                    )}
                    <Text style={styles.followButtonText}>
                      {isFollowing ? 'Ne plus suivre' : 'Suivre'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Events Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Événements organisés</Text>
          {events.length === 0 ? (
            <Text style={styles.emptyText}>Aucun événement pour le moment</Text>
          ) : (
            <FlatList
              data={events}
              renderItem={renderEventCard}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.eventRow}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
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
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary.purple,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary.purple,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary.purple,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
    color: colors.text.primary,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.muted,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.light,
  },
  followButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  followButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  followButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },
  eventRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eventCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  eventImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.background.card,
  },
  eventContent: {
    padding: 12,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  eventInfoText: {
    fontSize: 11,
    color: colors.text.muted,
    flex: 1,
  },
  errorText: {
    color: colors.status.error,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
});
