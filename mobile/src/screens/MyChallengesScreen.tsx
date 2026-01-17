import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Zap, Star, Crown, Flame, Target, Shield, Gift, Sparkles } from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

type Challenge = {
  id: string;
  title: string;
  description: string;
  reward: { type: string; amount: number; label: string };
  progress: { value: number; max: number };
  status: 'active' | 'completed' | 'claimed';
  canClaim: boolean;
  claimedAt: string | null;
  badge?: string | null;
};

const CHALLENGE_ICONS = [Trophy, Zap, Star, Crown, Flame, Target, Shield, Gift, Sparkles];

function getChallengeIcon(index: number) {
  return CHALLENGE_ICONS[index % CHALLENGE_ICONS.length];
}

const CHALLENGE_GRADIENTS = [
  ['#9333ea', '#7c3aed', '#6366f1'],
  ['#ec4899', '#f43f5e', '#ef4444'],
  ['#f59e0b', '#f97316', '#ef4444'],
  ['#10b981', '#14b8a6', '#06b6d4'],
  ['#3b82f6', '#6366f1', '#8b5cf6'],
  ['#d946ef', '#ec4899', '#f43f5e'],
];

function getChallengeGradient(index: number): [string, string, string] {
  return CHALLENGE_GRADIENTS[index % CHALLENGE_GRADIENTS.length] as [string, string, string];
}

export default function MyChallengesScreen() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    loadChallenges();
  }, []);

  async function loadChallenges() {
    try {
      setError(null);
      const res = await api.get('/api/challenges/mine');
      setChallenges(Array.isArray(res.data?.challenges) ? res.data.challenges : []);
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

  async function claimReward(challengeId: string) {
    setClaimingId(challengeId);
    try {
      await api.post(`/api/challenges/${challengeId}/claim`);
      Alert.alert('Succès', 'Récompense réclamée !');
      loadChallenges();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur réclamation récompense');
    } finally {
      setClaimingId(null);
    }
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
        <TouchableOpacity style={styles.retryButton} onPress={loadChallenges}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasClaimable = challenges.some((c) => c.canClaim);
  const completedCount = challenges.filter((c) => c.status === 'claimed').length;
  const activeCount = challenges.filter((c) => c.status === 'active').length;
  const totalXP = challenges
    .filter((c) => c.status === 'claimed')
    .reduce((acc, c) => acc + (c.reward?.amount || 0), 0);

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
              colors={['rgba(168, 85, 247, 0.2)', 'rgba(236, 72, 153, 0.2)']}
              style={styles.headerIconGradient}
            >
              <Trophy size={24} color="#a855f7" />
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Mes Défis</Text>
            <Text style={styles.headerSubtitle}>
              {completedCount} complétés · {activeCount} actifs
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalXP}</Text>
            <Text style={styles.statLabel}>XP Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Complétés</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>
        </View>

        {hasClaimable && (
          <View style={styles.claimableAlert}>
            <Gift size={20} color="#fbbf24" />
            <Text style={styles.claimableText}>
              Vous avez des récompenses à réclamer !
            </Text>
          </View>
        )}

        {/* Challenges List */}
        {challenges.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>Aucun défi disponible</Text>
            <Text style={styles.emptyText}>Revenez plus tard pour de nouveaux défis</Text>
          </View>
        ) : (
          <View style={styles.challengesList}>
            {challenges.map((challenge, index) => {
              const Icon = getChallengeIcon(index);
              const gradient = getChallengeGradient(index);
              const progressPercent = (challenge.progress.value / challenge.progress.max) * 100;

              return (
                <View key={challenge.id} style={styles.challengeCard}>
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.challengeGradient}
                  >
                    <View style={styles.challengeHeader}>
                      <View style={styles.challengeIconContainer}>
                        <Icon size={24} color="#fff" />
                      </View>
                      {challenge.status === 'claimed' && (
                        <View style={styles.claimedBadge}>
                          <Sparkles size={12} color="#fbbf24" />
                          <Text style={styles.claimedText}>Réclamé</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeDescription}>{challenge.description}</Text>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(progressPercent, 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {challenge.progress.value} / {challenge.progress.max}
                      </Text>
                    </View>

                    {/* Reward */}
                    <View style={styles.rewardContainer}>
                      <View style={styles.rewardInfo}>
                        <Star size={16} color="#fbbf24" fill="#fbbf24" />
                        <Text style={styles.rewardText}>
                          {challenge.reward.label || `${challenge.reward.amount} XP`}
                        </Text>
                      </View>

                      {challenge.canClaim && (
                        <TouchableOpacity
                          style={styles.claimButton}
                          onPress={() => claimReward(challenge.id)}
                          disabled={claimingId === challenge.id}
                        >
                          {claimingId === challenge.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Gift size={16} color="#fff" />
                              <Text style={styles.claimButtonText}>Réclamer</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>

                    {challenge.badge && (
                      <View style={styles.badgeContainer}>
                        <Shield size={14} color="#fbbf24" />
                        <Text style={styles.badgeText}>Badge: {challenge.badge}</Text>
                      </View>
                    )}
                  </LinearGradient>
                </View>
              );
            })}
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
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary.purple,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary.purple,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.muted,
  },
  claimableAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  claimableText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#fbbf24',
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
    gap: 16,
  },
  challengeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  challengeGradient: {
    padding: 20,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  claimedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fbbf24',
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  challengeDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'right',
  },
  rewardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  claimButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fbbf24',
  },
});
