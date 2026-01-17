import React, { useState, useEffect } from 'react';
import logger from '../lib/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, TrendingUp, DollarSign, Users, Ticket, BarChart3 } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

type TicketTypeStat = {
  ticketTypeId: number;
  ticketTypeName: string;
  price: number;
  currency: string;
  totalQuantity: number;
  availableQuantity: number;
  soldQuantity: number;
  soldPercentage: number;
  revenueCDF: number;
  revenueUSD: number;
  numberOfPurchases: number;
};

type SalesStats = {
  event: {
    id: number;
    title: string;
    startDate: string;
  };
  summary: {
    totalCapacity: number;
    totalSold: number;
    totalAvailable: number;
    soldPercentage: number;
    totalRevenueCDF: number;
    totalRevenueUSD: number;
    numberOfPurchases: number;
    numberOfBuyers: number;
  };
  ticketTypes: TicketTypeStat[];
  recentPurchases: any[];
};

export default function SalesStatsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { eventId } = route.params;

  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [eventId]);

  async function loadStats() {
    try {
      setError(null);
      const response = await api.get(`/api/events/${eventId}/sales-stats`);
      setStats(response.data);
    } catch (err: any) {
      logger.error('Erreur chargement stats:', err);
      setError(err?.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadStats();
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat('fr-FR').format(num);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Chargement des statistiques...</Text>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Erreur de chargement'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadStats}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary.purple, colors.primary.violet]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Statistiques de vente</Text>
          <Text style={styles.headerSubtitle}>{stats.event.title}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.summaryCardPurple]}>
            <Ticket size={24} color={colors.primary.purple} />
            <Text style={styles.summaryValue}>{formatNumber(stats.summary.totalSold)}</Text>
            <Text style={styles.summaryLabel}>Billets vendus</Text>
            <Text style={styles.summarySubtext}>
              sur {formatNumber(stats.summary.totalCapacity)}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.summaryCardPink]}>
            <TrendingUp size={24} color={colors.primary.pink} />
            <Text style={styles.summaryValue}>{stats.summary.soldPercentage}%</Text>
            <Text style={styles.summaryLabel}>Taux de vente</Text>
            <Text style={styles.summarySubtext}>
              {formatNumber(stats.summary.totalAvailable)} restants
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.summaryCardViolet]}>
            <DollarSign size={24} color={colors.primary.violet} />
            <Text style={styles.summaryValue}>
              {formatNumber(stats.summary.totalRevenueCDF)}
            </Text>
            <Text style={styles.summaryLabel}>Revenus CDF</Text>
            {stats.summary.totalRevenueUSD > 0 && (
              <Text style={styles.summarySubtext}>
                {formatNumber(stats.summary.totalRevenueUSD)} USD
              </Text>
            )}
          </View>

          <View style={[styles.summaryCard, styles.summaryCardGreen]}>
            <Users size={24} color="#10b981" />
            <Text style={styles.summaryValue}>{formatNumber(stats.summary.numberOfBuyers)}</Text>
            <Text style={styles.summaryLabel}>Acheteurs</Text>
            <Text style={styles.summarySubtext}>
              {formatNumber(stats.summary.numberOfPurchases)} achats
            </Text>
          </View>
        </View>

        {/* Ticket Types Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={20} color={colors.primary.purple} />
            <Text style={styles.sectionTitle}>Ventes par type de billet</Text>
          </View>

          {stats.ticketTypes.map((ticketType) => (
            <View key={ticketType.ticketTypeId} style={styles.ticketTypeCard}>
              <View style={styles.ticketTypeHeader}>
                <Text style={styles.ticketTypeName}>{ticketType.ticketTypeName}</Text>
                <Text style={styles.ticketTypePrice}>
                  {formatNumber(ticketType.price)} {ticketType.currency}
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${ticketType.soldPercentage}%` },
                  ]}
                />
              </View>

              <View style={styles.ticketTypeStats}>
                <View style={styles.ticketTypeStat}>
                  <Text style={styles.ticketTypeStatValue}>
                    {formatNumber(ticketType.soldQuantity)}/{formatNumber(ticketType.totalQuantity)}
                  </Text>
                  <Text style={styles.ticketTypeStatLabel}>Vendus</Text>
                </View>

                <View style={styles.ticketTypeStat}>
                  <Text style={styles.ticketTypeStatValue}>{ticketType.soldPercentage}%</Text>
                  <Text style={styles.ticketTypeStatLabel}>Taux</Text>
                </View>

                <View style={styles.ticketTypeStat}>
                  <Text style={styles.ticketTypeStatValue}>
                    {formatNumber(ticketType.numberOfPurchases)}
                  </Text>
                  <Text style={styles.ticketTypeStatLabel}>Achats</Text>
                </View>

                <View style={styles.ticketTypeStat}>
                  <Text style={styles.ticketTypeStatValue}>
                    {ticketType.revenueCDF > 0
                      ? `${formatNumber(ticketType.revenueCDF)} CDF`
                      : `${formatNumber(ticketType.revenueUSD)} USD`}
                  </Text>
                  <Text style={styles.ticketTypeStatLabel}>Revenus</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Purchases */}
        {stats.recentPurchases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achats récents</Text>
            {stats.recentPurchases.map((purchase) => {
              const ticketType = stats.ticketTypes.find(
                (t) => t.ticketTypeId === purchase.ticketTypeId
              );
              return (
                <View key={purchase.id} style={styles.purchaseCard}>
                  <View style={styles.purchaseInfo}>
                    <Text style={styles.purchaseTicketType}>
                      {ticketType?.ticketTypeName || 'Ticket'}
                    </Text>
                    <Text style={styles.purchaseDate}>
                      {new Date(purchase.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.purchaseAmount}>
                    <Text style={styles.purchasePrice}>
                      {formatNumber(purchase.amount)} {purchase.currency}
                    </Text>
                    <Text style={styles.purchaseQuantity}>x{purchase.quantity}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
    backgroundColor: colors.background.dark,
    padding: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerContent: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.primary,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  summaryCardPurple: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.purple,
  },
  summaryCardPink: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.pink,
  },
  summaryCardViolet: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.violet,
  },
  summaryCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  summarySubtext: {
    fontSize: 11,
    color: colors.text.muted,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  ticketTypeCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  ticketTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  ticketTypePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.purple,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary.purple,
    borderRadius: 4,
  },
  ticketTypeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketTypeStat: {
    alignItems: 'center',
  },
  ticketTypeStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  ticketTypeStatLabel: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  purchaseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseTicketType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  purchaseDate: {
    fontSize: 12,
    color: colors.text.muted,
  },
  purchaseAmount: {
    alignItems: 'flex-end',
  },
  purchasePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.purple,
  },
  purchaseQuantity: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.status.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 16,
  },
});
