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
import { useNavigation } from '@react-navigation/native';
import { Flag, Activity, Shield, ClipboardList, ChevronRight } from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

type ModeratorStats = {
  pendingReports: number;
  resolvedReports: number;
  reportedUsers: number;
  recentActivity: number;
};

export default function ModeratorDashboardScreen() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<ModeratorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setError(null);
      const [reportsRes, usersRes, activityRes] = await Promise.all([
        api.get('/api/moderator/reports'),
        api.get('/api/moderator/users/reported'),
        api.get('/api/moderator/activity'),
      ]);

      const reports = Array.isArray(reportsRes.data) ? reportsRes.data : [];
      const users = Array.isArray(usersRes.data) ? usersRes.data : [];
      const activity = Array.isArray(activityRes.data) ? activityRes.data : [];

      setStats({
        pendingReports: reports.filter((r: any) => r.status === 'pending').length,
        resolvedReports: reports.filter((r: any) => r.status === 'resolved').length,
        reportedUsers: users.length,
        recentActivity: activity.length,
      });
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
        <Text style={styles.loadingText}>Chargement...</Text>
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

  const menuItems = [
    {
      icon: Flag,
      title: 'Signalements',
      subtitle: stats ? `${stats.pendingReports} en attente` : 'Gérer les signalements',
      screen: 'ModeratorReports',
      color: '#ef4444',
      gradient: ['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.2)'],
    },
    {
      icon: Shield,
      title: 'Utilisateurs signalés',
      subtitle: stats ? `${stats.reportedUsers} utilisateurs` : 'Voir les utilisateurs',
      screen: 'ModeratorUsers',
      color: '#f59e0b',
      gradient: ['rgba(245, 158, 11, 0.2)', 'rgba(217, 119, 6, 0.2)'],
    },
    {
      icon: Activity,
      title: 'Activité',
      subtitle: stats ? `${stats.recentActivity} actions récentes` : 'Historique des actions',
      screen: 'ModeratorActivity',
      color: '#3b82f6',
      gradient: ['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.2)'],
    },
    {
      icon: ClipboardList,
      title: 'Défis',
      subtitle: 'Gérer les défis',
      screen: 'ModeratorChallenges',
      color: '#a855f7',
      gradient: ['rgba(168, 85, 247, 0.2)', 'rgba(147, 51, 234, 0.2)'],
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
              colors={['rgba(245, 158, 11, 0.2)', 'rgba(217, 119, 6, 0.2)']}
              style={styles.headerIconGradient}
            >
              <Shield size={24} color="#fbbf24" />
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Modération</Text>
            <Text style={styles.headerSubtitle}>Gérer la plateforme</Text>
          </View>
        </View>

        {/* Stats Summary */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pendingReports}</Text>
              <Text style={styles.statLabel}>En attente</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.resolvedReports}</Text>
              <Text style={styles.statLabel}>Résolus</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.reportedUsers}</Text>
              <Text style={styles.statLabel}>Utilisateurs</Text>
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Actions</Text>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.title}
                style={styles.menuItem}
                onPress={() => navigation.navigate(item.screen)}
              >
                <View style={styles.menuItemLeft}>
                  <LinearGradient
                    colors={item.gradient as [string, string]}
                    style={styles.menuIconContainer}
                  >
                    <Icon size={20} color={item.color} />
                  </LinearGradient>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.text.muted} />
              </TouchableOpacity>
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.muted,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: 12,
  },
  menuSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
  },
});
