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
import { Users, Calendar, Ticket, DollarSign, BarChart3 } from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

type Stats = {
  users: { total: number; newThisMonth: number };
  events: { total: number; published: number; draft: number };
  tickets: { total: number; sold: number; cancelled: number; revenue: number };
  ticketTypes: { total: number; active: number };
};

export default function AdminStatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setError(null);
      const res = await api.get<Stats>('/api/admin/stats');
      setStats(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadStats();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Chargement des statistiques...</Text>
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

  if (!stats) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>Aucune donnée disponible</Text>
        <Text style={styles.emptyText}>Les statistiques ne sont pas encore disponibles.</Text>
      </View>
    );
  }

  const statCards = [
    {
      icon: Users,
      title: 'Utilisateurs',
      value: stats.users.total.toString(),
      subtitle: `+${stats.users.newThisMonth} nouveaux (30j)`,
      colors: ['#3b82f6', '#06b6d4'],
      iconColor: '#93c5fd',
    },
    {
      icon: Calendar,
      title: 'Événements',
      value: stats.events.total.toString(),
      subtitle: `${stats.events.published} publiés · ${stats.events.draft} brouillons`,
      colors: ['#a855f7', '#ec4899'],
      iconColor: '#d8b4fe',
    },
    {
      icon: Ticket,
      title: 'Tickets',
      value: stats.tickets.total.toString(),
      subtitle: `${stats.tickets.sold} vendus · ${stats.tickets.cancelled} annulés`,
      colors: ['#10b981', '#059669'],
      iconColor: '#6ee7b7',
    },
    {
      icon: DollarSign,
      title: 'Revenus',
      value: `${stats.tickets.revenue} FC`,
      subtitle: `${stats.ticketTypes.active} types actifs · ${stats.ticketTypes.total} total`,
      colors: ['#f59e0b', '#f97316'],
      iconColor: '#fcd34d',
    },
  ];

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
              colors={['rgba(239, 68, 68, 0.2)', 'rgba(244, 63, 94, 0.2)']}
              style={styles.headerIconGradient}
            >
              <BarChart3 size={24} color="#fca5a5" />
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Statistiques Admin</Text>
            <Text style={styles.headerSubtitle}>Vue d'ensemble de la plateforme</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <View key={stat.title} style={styles.statCard}>
                <View style={styles.statCardHeader}>
                  <LinearGradient
                    colors={stat.colors as [string, string]}
                    style={styles.statIconContainer}
                  >
                    <Icon size={24} color={stat.iconColor} />
                  </LinearGradient>
                  <View style={styles.statDot} />
                </View>

                <View style={styles.statContent}>
                  <Text style={styles.statTitle}>{stat.title}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statSubtitle} numberOfLines={2}>
                    {stat.subtitle}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
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
  statsGrid: {
    gap: 16,
  },
  statCard: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 16,
    padding: 20,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.purple,
    opacity: 0.6,
  },
  statContent: {
    gap: 4,
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 16,
  },
});
