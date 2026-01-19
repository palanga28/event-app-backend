import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  ChevronRight,
  X,
  Smartphone,
  Building2,
} from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import logger from '../lib/logger';

type Balance = {
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  availableBalance: number;
  currency: string;
  eventCount: number;
  ticketsSold: number;
};

type Payout = {
  id: number;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  payout_method: string;
  created_at: string;
  processed_at?: string;
  admin_notes?: string;
};

type EventEarning = {
  eventId: number;
  eventTitle: string;
  eventDate: string;
  organizerReceives: number;
  ticketsSold: number;
};

export default function OrganizerEarningsScreen() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [earnings, setEarnings] = useState<EventEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'events'>('overview');
  
  // Modal de retrait
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'mobile_money' | 'bank'>('mobile_money');
  const [mobilePhone, setMobilePhone] = useState('');
  const [mobileNetwork, setMobileNetwork] = useState('vodacom');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [balanceRes, payoutsRes, earningsRes] = await Promise.all([
        api.get('/api/organizer/balance'),
        api.get('/api/organizer/payouts').catch(() => ({ data: [] })),
        api.get('/api/organizer/earnings').catch(() => ({ data: [] })),
      ]);

      setBalance(balanceRes.data);
      setPayouts(Array.isArray(payoutsRes.data) ? payoutsRes.data : []);
      setEarnings(Array.isArray(earningsRes.data) ? earningsRes.data : []);
    } catch (err) {
      logger.error('Erreur chargement données organisateur:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    if (balance && amount > balance.availableBalance) {
      Alert.alert('Erreur', `Solde insuffisant. Disponible: ${balance.availableBalance.toLocaleString()} ${balance.currency}`);
      return;
    }

    if (withdrawMethod === 'mobile_money' && !mobilePhone) {
      Alert.alert('Erreur', 'Veuillez entrer votre numéro Mobile Money');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/organizer/payout-request', {
        amount,
        currency: balance?.currency || 'CDF',
        payout_method: withdrawMethod,
        payout_details: withdrawMethod === 'mobile_money' 
          ? { phone: mobilePhone, network: mobileNetwork }
          : {},
      });

      Alert.alert('Succès', 'Votre demande de retrait a été envoyée. Elle sera traitée sous 24-48h.');
      setWithdrawModalVisible(false);
      setWithdrawAmount('');
      setMobilePhone('');
      loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelPayout = async (payoutId: number) => {
    Alert.alert(
      'Annuler la demande',
      'Voulez-vous vraiment annuler cette demande de retrait ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/organizer/payout/${payoutId}`);
              Alert.alert('Succès', 'Demande annulée');
              loadData();
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Erreur');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount?: number, currency: string = 'CDF') => {
    return `${(amount || 0).toLocaleString()} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'processing': return '#3B82F6';
      case 'rejected': return '#EF4444';
      default: return colors.text.muted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Payé';
      case 'pending': return 'En attente';
      case 'processing': return 'En cours';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.purple} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec solde */}
        <LinearGradient
          colors={[colors.primary.purple, colors.primary.pink]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(balance?.availableBalance || 0, balance?.currency)}
          </Text>
          
          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>{balance?.eventCount || 0}</Text>
              <Text style={styles.balanceStatLabel}>Événements</Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>{balance?.ticketsSold || 0}</Text>
              <Text style={styles.balanceStatLabel}>Tickets vendus</Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>
                {formatCurrency(balance?.totalEarnings || 0, balance?.currency)}
              </Text>
              <Text style={styles.balanceStatLabel}>Gains totaux</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.withdrawButton}
            onPress={() => setWithdrawModalVisible(true)}
            disabled={!balance || balance.availableBalance <= 0}
          >
            <Wallet size={20} color="#fff" />
            <Text style={styles.withdrawButtonText}>Demander un retrait</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Aperçu
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              Retraits
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'events' && styles.tabActive]}
            onPress={() => setActiveTab('events')}
          >
            <Text style={[styles.tabText, activeTab === 'events' && styles.tabTextActive]}>
              Par événement
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenu selon l'onglet */}
        {activeTab === 'overview' && (
          <View style={styles.content}>
            {/* Résumé */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <TrendingUp size={24} color="#10B981" />
                  <Text style={styles.summaryValue}>
                    {formatCurrency(balance?.totalEarnings || 0)}
                  </Text>
                  <Text style={styles.summaryLabel}>Gains totaux</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Clock size={24} color="#F59E0B" />
                  <Text style={styles.summaryValue}>
                    {formatCurrency(balance?.pendingPayouts || 0)}
                  </Text>
                  <Text style={styles.summaryLabel}>En attente</Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <CheckCircle size={24} color="#3B82F6" />
                  <Text style={styles.summaryValue}>
                    {formatCurrency(balance?.completedPayouts || 0)}
                  </Text>
                  <Text style={styles.summaryLabel}>Déjà retiré</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Wallet size={24} color={colors.primary.purple} />
                  <Text style={styles.summaryValue}>
                    {formatCurrency(balance?.availableBalance || 0)}
                  </Text>
                  <Text style={styles.summaryLabel}>Disponible</Text>
                </View>
              </View>
            </View>

            {/* Commission info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>💡 Comment ça marche ?</Text>
              <Text style={styles.infoText}>
                • Une commission de 6% est prélevée sur chaque vente{'\n'}
                • Vos gains sont disponibles immédiatement après la vente{'\n'}
                • Les retraits sont traités sous 24-48h{'\n'}
                • Montant minimum de retrait : 5 000 CDF
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.content}>
            {payouts.length === 0 ? (
              <View style={styles.emptyState}>
                <Wallet size={48} color={colors.text.muted} />
                <Text style={styles.emptyText}>Aucun retrait effectué</Text>
              </View>
            ) : (
              payouts.map((payout) => (
                <View key={payout.id} style={styles.payoutCard}>
                  <View style={styles.payoutHeader}>
                    <Text style={styles.payoutAmount}>
                      {formatCurrency(payout.amount, payout.currency)}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payout.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(payout.status) }]}>
                        {getStatusLabel(payout.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.payoutDate}>
                    Demandé le {formatDate(payout.created_at)}
                  </Text>
                  {payout.processed_at && (
                    <Text style={styles.payoutDate}>
                      Traité le {formatDate(payout.processed_at)}
                    </Text>
                  )}
                  {payout.admin_notes && (
                    <Text style={styles.payoutNotes}>{payout.admin_notes}</Text>
                  )}
                  {payout.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => cancelPayout(payout.id)}
                    >
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'events' && (
          <View style={styles.content}>
            {earnings.length === 0 ? (
              <View style={styles.emptyState}>
                <TrendingUp size={48} color={colors.text.muted} />
                <Text style={styles.emptyText}>Aucune vente pour le moment</Text>
              </View>
            ) : (
              earnings.map((event) => (
                <View key={event.eventId} style={styles.eventCard}>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.eventTitle}
                    </Text>
                    <Text style={styles.eventDate}>{formatDate(event.eventDate)}</Text>
                  </View>
                  <View style={styles.eventStats}>
                    <Text style={styles.eventEarnings}>
                      {formatCurrency(event.organizerReceives)}
                    </Text>
                    <Text style={styles.eventTickets}>
                      {event.ticketsSold} ticket{event.ticketsSold > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal de retrait */}
      <Modal
        visible={withdrawModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Demander un retrait</Text>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Montant à retirer</Text>
            <TextInput
              style={styles.input}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder={`Max: ${balance?.availableBalance?.toLocaleString() || 0} ${balance?.currency || 'CDF'}`}
              placeholderTextColor={colors.text.muted}
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Méthode de paiement</Text>
            <View style={styles.methodButtons}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  withdrawMethod === 'mobile_money' && styles.methodButtonActive,
                ]}
                onPress={() => setWithdrawMethod('mobile_money')}
              >
                <Smartphone size={20} color={withdrawMethod === 'mobile_money' ? '#fff' : colors.text.primary} />
                <Text style={[
                  styles.methodButtonText,
                  withdrawMethod === 'mobile_money' && styles.methodButtonTextActive,
                ]}>
                  Mobile Money
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  withdrawMethod === 'bank' && styles.methodButtonActive,
                ]}
                onPress={() => setWithdrawMethod('bank')}
              >
                <Building2 size={20} color={withdrawMethod === 'bank' ? '#fff' : colors.text.primary} />
                <Text style={[
                  styles.methodButtonText,
                  withdrawMethod === 'bank' && styles.methodButtonTextActive,
                ]}>
                  Virement
                </Text>
              </TouchableOpacity>
            </View>

            {withdrawMethod === 'mobile_money' && (
              <>
                <Text style={styles.modalLabel}>Numéro Mobile Money</Text>
                <TextInput
                  style={styles.input}
                  value={mobilePhone}
                  onChangeText={setMobilePhone}
                  placeholder="0991234567"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="phone-pad"
                />

                <Text style={styles.modalLabel}>Réseau</Text>
                <View style={styles.networkButtons}>
                  {['vodacom', 'airtel', 'orange', 'africell'].map((network) => (
                    <TouchableOpacity
                      key={network}
                      style={[
                        styles.networkButton,
                        mobileNetwork === network && styles.networkButtonActive,
                      ]}
                      onPress={() => setMobileNetwork(network)}
                    >
                      <Text style={[
                        styles.networkButtonText,
                        mobileNetwork === network && styles.networkButtonTextActive,
                      ]}>
                        {network.charAt(0).toUpperCase() + network.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {withdrawMethod === 'bank' && (
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  Pour un virement bancaire, veuillez contacter notre support avec vos coordonnées bancaires.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleWithdrawRequest}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Envoyer la demande</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  balanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  balanceStat: {
    alignItems: 'center',
  },
  balanceStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  balanceStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.primary.purple,
  },
  tabText: {
    fontSize: 14,
    color: colors.text.muted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.muted,
    marginTop: 16,
  },
  payoutCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  payoutDate: {
    fontSize: 13,
    color: colors.text.muted,
  },
  payoutNotes: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  cancelButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  eventCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
    marginRight: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  eventDate: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
  },
  eventStats: {
    alignItems: 'flex-end',
  },
  eventEarnings: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  eventTickets: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.dark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodButtonActive: {
    backgroundColor: colors.primary.purple,
    borderColor: colors.primary.purple,
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  methodButtonTextActive: {
    color: '#fff',
  },
  networkButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  networkButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  networkButtonActive: {
    backgroundColor: colors.primary.purple + '30',
    borderColor: colors.primary.purple,
  },
  networkButtonText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  networkButtonTextActive: {
    color: colors.primary.purple,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary.purple,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
