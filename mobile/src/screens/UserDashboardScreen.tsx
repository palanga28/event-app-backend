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
import { Calendar, Ticket, Heart, User, ChevronRight, TrendingUp } from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

type UserStats = {
  myEvents: number;
  myTickets: number;
  myFavorites: number;
  upcomingEvents: number;
};

export default function UserDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setError(null);
      const [eventsRes, ticketsRes, favoritesRes] = await Promise.all([
        api.get('/api/events/mine'),
        api.get('/api/tickets/user'),
        api.get('/api/favorites'),
      ]);

      const events = Array.isArray(eventsRes.data) ? eventsRes.data : [];
      const tickets = Array.isArray(ticketsRes.data) ? ticketsRes.data : [];
      const favorites = Array.isArray(favoritesRes.data) ? favoritesRes.data : [];

      const now = new Date();
      const upcoming = events.filter((e: any) => new Date(e.start_date) > now);

      setStats({
        myEvents: events.length,
        myTickets: tickets.length,
        myFavorites: favorites.length,
        upcomingEvents: upcoming.length,
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

  const statCards = [
    {
      icon: Calendar,
      title: 'Mes événements',
      value: stats?.myEvents || 0,
      subtitle: `${stats?.upcomingEvents || 0} à venir`,
      colors: ['#a855f7', '#ec4899'],
      iconColor: '#d8b4fe',
      screen: 'MyEvents',
    },
    {
      icon: Ticket,
      title: 'Mes tickets',
      value: stats?.myTickets || 0,
      subtitle: 'Billets achetés',
      colors: ['#10b981', '#059669'],
      iconColor: '#6ee7b7',
      screen: 'MyTickets',
    },
    {
      icon: Heart,
      title: 'Mes favoris',
      value: stats?.myFavorites || 0,
      subtitle: 'Événements sauvegardés',
      colors: ['#ec4899', '#f43f5e'],
      iconColor: '#f9a8d4',
      screen: 'MyFavorites',
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
              colors={['rgba(168, 85, 247, 0.2)', 'rgba(236, 72, 153, 0.2)']}
              style={styles.headerIconGradient}
            >
              <User size={24} color="#d8b4fe" />
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Mon espace</Text>
            <Text style={styles.headerSubtitle}>Bienvenue {user?.name}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <TouchableOpacity
                key={stat.title}
                style={styles.statCard}
                onPress={() => navigation.navigate(stat.screen)}
              >
                <View style={styles.statCardHeader}>
                  <LinearGradient
                    colors={stat.colors as [string, string]}
                    style={styles.statIconContainer}
                  >
                    <Icon size={24} color={stat.iconColor} />
                  </LinearGradient>
                  <ChevronRight size={20} color={colors.text.muted} />
                </View>

                <View style={styles.statContent}>
                  <Text style={styles.statTitle}>{stat.title}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateEvent')}
          >
            <LinearGradient
              colors={['rgba(147, 51, 234, 0.3)', 'rgba(236, 72, 153, 0.3)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Calendar size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Créer un événement</Text>
              <ChevronRight size={20} color={colors.text.muted} style={{ marginLeft: 'auto' }} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('SearchEvents')}
          >
            <View style={styles.actionButtonContent}>
              <TrendingUp size={20} color="#60a5fa" />
              <Text style={styles.actionButtonText}>Découvrir des événements</Text>
              <ChevronRight size={20} color={colors.text.muted} style={{ marginLeft: 'auto' }} />
            </View>
          </TouchableOpacity>
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
  statsGrid: {
    gap: 16,
    marginBottom: 24,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
  },
  quickActions: {
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
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    borderRadius: 12,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
});
