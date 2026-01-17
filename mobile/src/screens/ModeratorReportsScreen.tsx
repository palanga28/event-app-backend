import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flag, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

type Report = {
  id: number;
  type: string;
  reason: string;
  status: 'pending' | 'resolved';
  created_at: string;
  reporter?: { name: string };
  target?: any;
};

export default function ModeratorReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');

  useEffect(() => {
    loadReports();
  }, [filter]);

  async function loadReports() {
    try {
      setError(null);
      const query = filter === 'all' ? '' : `status=${filter}`;
      const res = await api.get(`/api/moderator/reports?${query}`);
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadReports();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Chargement des signalements...</Text>
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

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;

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
              colors={['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.2)']}
              style={styles.headerIconGradient}
            >
              <Flag size={24} color="#ef4444" />
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Signalements</Text>
            <Text style={styles.headerSubtitle}>{pendingCount} en attente · {resolvedCount} résolus</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}>
              En attente ({pendingCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'resolved' && styles.filterTabActive]}
            onPress={() => setFilter('resolved')}
          >
            <Text style={[styles.filterTabText, filter === 'resolved' && styles.filterTabTextActive]}>
              Résolus ({resolvedCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
              Tous ({reports.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reports List */}
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Aucun signalement</Text>
            <Text style={styles.emptyText}>
              {filter === 'pending' ? 'Aucun signalement en attente' : 'Aucun signalement trouvé'}
            </Text>
          </View>
        ) : (
          <View style={styles.reportsList}>
            {reports.map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View style={styles.reportType}>
                    <Flag size={16} color="#ef4444" />
                    <Text style={styles.reportTypeText}>{report.type}</Text>
                  </View>
                  {report.status === 'pending' ? (
                    <View style={styles.statusBadgePending}>
                      <Clock size={12} color="#f59e0b" />
                      <Text style={styles.statusTextPending}>En attente</Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadgeResolved}>
                      <CheckCircle size={12} color="#10b981" />
                      <Text style={styles.statusTextResolved}>Résolu</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.reportReason}>{report.reason}</Text>

                {report.reporter && (
                  <Text style={styles.reportMeta}>
                    Signalé par {report.reporter.name}
                  </Text>
                )}

                <Text style={styles.reportDate}>
                  {new Date(report.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
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
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary.purple,
    borderColor: colors.primary.purple,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.muted,
  },
  filterTabTextActive: {
    color: colors.text.primary,
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
  reportsList: {
    gap: 12,
  },
  reportCard: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 6,
  },
  statusTextPending: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
  },
  statusBadgeResolved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
  },
  statusTextResolved: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  reportReason: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 8,
    lineHeight: 20,
  },
  reportMeta: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 11,
    color: colors.text.muted,
  },
});
