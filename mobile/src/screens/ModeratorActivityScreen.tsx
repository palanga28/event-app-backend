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
import { Activity, CheckCircle, Flag, Calendar } from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

type ActivityItem = {
  id: number;
  action: string | null;
  type: string;
  targetId: number;
  moderatorId: number | null;
  moderator: { id: number; name: string; email: string } | null;
  timestamp: string | null;
  category?: 'moderation' | 'publication';
  metadata?: any;
};

export default function ModeratorActivityScreen() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivity();
  }, []);

  async function loadActivity() {
    try {
      setError(null);
      const res = await api.get<ActivityItem[]>('/api/moderator/activity');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadActivity();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Chargement de l'activité...</Text>
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
              colors={['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.2)']}
              style={styles.headerIconGradient}
            >
              <Activity size={24} color="#60a5fa" />
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Activité</Text>
            <Text style={styles.headerSubtitle}>{items.length} action{items.length > 1 ? 's' : ''} récente{items.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Activity List */}
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>Aucune activité</Text>
            <Text style={styles.emptyText}>Aucune action récente de modération</Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {items.map((item) => {
              const isPublication = item.category === 'publication';
              const icon = isPublication ? Calendar : Flag;
              const iconColor = isPublication ? '#a78bfa' : '#ef4444';
              const bgColor = isPublication ? 'rgba(168, 85, 247, 0.1)' : 'rgba(239, 68, 68, 0.1)';

              return (
                <View key={item.id} style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <View style={[styles.activityIcon, { backgroundColor: bgColor }]}>
                      {React.createElement(icon, { size: 20, color: iconColor })}
                    </View>
                    <View style={styles.activityContent}>
                      {isPublication ? (
                        <>
                          <Text style={styles.activityText}>
                            <Text style={styles.activityAuthor}>
                              {item.moderator ? item.moderator.name : 'Utilisateur'}
                            </Text>
                            {' '}a publié{' '}
                            <Text style={styles.activityType}>
                              {item.type === 'story' ? 'une story' : 'un événement'}
                            </Text>
                          </Text>
                          {item.metadata?.title && item.type === 'event' && (
                            <Text style={styles.activityMeta}>
                              {item.metadata.title}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text style={styles.activityText}>
                          <Text style={styles.activityAuthor}>
                            {item.moderator ? item.moderator.name : 'Modérateur'}
                          </Text>
                          {' → '}
                          <Text style={styles.activityAction}>{item.action || 'Action'}</Text>
                          {' sur '}
                          <Text style={styles.activityType}>{item.type}</Text>
                          {' #'}{item.targetId}
                        </Text>
                      )}
                      {item.timestamp && (
                        <Text style={styles.activityTime}>
                          {new Date(item.timestamp).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      )}
                    </View>
                  </View>
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
  activityList: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: 4,
  },
  activityAuthor: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  activityAction: {
    fontWeight: '600',
    color: '#60a5fa',
  },
  activityType: {
    fontWeight: '500',
    color: colors.text.muted,
  },
  activityMeta: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 11,
    color: colors.text.muted,
  },
});
