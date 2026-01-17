import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ClipboardList, CheckCircle, Clock } from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

type Challenge = {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  points: number;
  created_at: string;
};

export default function ModeratorChallengesScreen() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChallenges();
  }, []);

  async function loadChallenges() {
    try {
      setError(null);
      const res = await api.get<Challenge[]>('/api/moderator/challenges');
      setChallenges(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadChallenges();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Chargement des défis...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const publishedCount = challenges.filter(c => c.status === 'published').length;
  const draftCount = challenges.filter(c => c.status === 'draft').length;

  return (
    <LinearGradient
      colors={colors.gradients.dark as [string, string]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.purple}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <LinearGradient
              colors={['rgba(168, 85, 247, 0.2)', 'rgba(147, 51, 234, 0.2)']}
              style={styles.headerIconGradient}
            >
              <ClipboardList size={24} color="#a855f7" />
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Défis</Text>
            <Text style={styles.headerSubtitle}>
              {publishedCount} publié{publishedCount > 1 ? 's' : ''} · {draftCount} brouillon{draftCount > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Challenges List */}
        {challenges.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>Aucun défi</Text>
            <Text style={styles.emptyText}>Aucun défi n'a été créé pour le moment</Text>
          </View>
        ) : (
          <View style={styles.challengesList}>
            {challenges.map((challenge) => (
              <View key={challenge.id} style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  {challenge.status === 'published' ? (
                    <View style={styles.statusBadgePublished}>
                      <CheckCircle size={12} color="#10b981" />
                      <Text style={styles.statusTextPublished}>Publié</Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadgeDraft}>
                      <Clock size={12} color="#6b7280" />
                      <Text style={styles.statusTextDraft}>Brouillon</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.challengeDescription} numberOfLines={2}>
                  {challenge.description}
                </Text>

                <View style={styles.challengeFooter}>
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsText}>⭐ {challenge.points} points</Text>
                  </View>
                  <Text style={styles.challengeDate}>
                    {new Date(challenge.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background.dark,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.muted,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#fca5a5',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
  },
  challengesList: {
    gap: 12,
  },
  challengeCard: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  challengeTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 22,
  },
  statusBadgePublished: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
  },
  statusTextPublished: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  statusBadgeDraft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderRadius: 6,
  },
  statusTextDraft: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  challengeDescription: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 20,
    marginBottom: 12,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 8,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a855f7',
  },
  challengeDate: {
    fontSize: 11,
    color: colors.text.muted,
  },
});
