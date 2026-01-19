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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  X,
  Phone,
  User,
  Calendar,
  DollarSign,
  Filter,
  Search,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import logger from '../lib/logger';

type PayoutRequest = {
  id: number;
  organizer_id: number;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  payout_method: string;
  payout_details: {
    phone?: string;
    network?: string;
  };
  created_at: string;
  processed_at?: string;
  admin_notes?: string;
  organizer?: {
    id: number;
    username: string;
    email: string;
    avatar_url?: string;
  };
};

type PayoutStats = {
  totalRequests: number;
  pendingRequests: number;
  pendingAmount: number;
  completedRequests: number;
  completedAmount: number;
  rejectedRequests: number;
  currency: string;
};

export default function AdminPayoutsScreen() {
  const navigation = useNavigation<any>();
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  
  // Modal de traitement
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = useCallback(async () => {
    try {
      const [payoutsRes, statsRes] = await Promise.all([
        api.get(`/api/admin/payout-requests?status=${statusFilter}`),
        api.get('/api/admin/payout-stats'),
      ]);

      setPayouts(Array.isArray(payoutsRes.data) ? payoutsRes.data : []);
      setStats(statsRes.data);
    } catch (err) {
      logger.error('Erreur chargement demandes de retrait:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const openProcessModal = (payout: PayoutRequest) => {
    setSelectedPayout(payout);
    setTransactionRef('');
    setAdminNotes('');
    setProcessModalVisible(true);
  };

  const handleProcess = async (action: 'approve' | 'reject') => {
    if (!selectedPayout) return;

    if (action === 'approve' && !transactionRef.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer la référence de transaction');
      return;
    }

    if (action === 'reject' && !adminNotes.trim()) {
      Alert.alert('Erreur', 'Veuillez indiquer la raison du rejet');
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/api/admin/payout/${selectedPayout.id}/process`, {
        action,
        transaction_ref: transactionRef || undefined,
        admin_notes: adminNotes || undefined,
      });

      Alert.alert(
        'Succès',
        action === 'approve' 
          ? 'Paiement marqué comme effectué' 
          : 'Demande rejetée'
      );
      setProcessModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors du traitement');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount?: number, currency: string = 'CDF') => {
    return `${(amount || 0).toLocaleString()} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const getNetworkLabel = (network?: string) => {
    if (!network) return 'Mobile Money';
    return network.charAt(0).toUpperCase() + network.slice(1);
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Demandes de retrait</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Clock size={20} color="#F59E0B" />
              <Text style={styles.statValue}>{stats.pendingRequests}</Text>
              <Text style={styles.statLabel}>En attente</Text>
              <Text style={styles.statAmount}>
                {formatCurrency(stats.pendingAmount, stats.currency)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.statValue}>{stats.completedRequests}</Text>
              <Text style={styles.statLabel}>Payés</Text>
              <Text style={styles.statAmount}>
                {formatCurrency(stats.completedAmount, stats.currency)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <XCircle size={20} color="#EF4444" />
              <Text style={styles.statValue}>{stats.rejectedRequests}</Text>
              <Text style={styles.statLabel}>Rejetés</Text>
            </View>
          </View>
        )}

        {/* Filtres */}
        <View style={styles.filters}>
          {['pending', 'processing', 'completed', 'rejected', 'all'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                statusFilter === status && styles.filterButtonActive,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterText,
                  statusFilter === status && styles.filterTextActive,
                ]}
              >
                {status === 'all' ? 'Tous' : getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Liste des demandes */}
        <View style={styles.content}>
          {payouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Wallet size={48} color={colors.text.muted} />
              <Text style={styles.emptyText}>Aucune demande</Text>
            </View>
          ) : (
            payouts.map((payout) => (
              <TouchableOpacity
                key={payout.id}
                style={styles.payoutCard}
                onPress={() => payout.status === 'pending' && openProcessModal(payout)}
                disabled={payout.status !== 'pending'}
              >
                {/* Header avec avatar et montant */}
                <View style={styles.payoutHeader}>
                  <View style={styles.organizerInfo}>
                    {payout.organizer?.avatar_url ? (
                      <Image
                        source={{ uri: payout.organizer.avatar_url }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <User size={20} color={colors.text.muted} />
                      </View>
                    )}
                    <View>
                      <Text style={styles.organizerName}>
                        {payout.organizer?.username || 'Organisateur'}
                      </Text>
                      <Text style={styles.organizerEmail}>
                        {payout.organizer?.email}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.amountContainer}>
                    <Text style={styles.payoutAmount}>
                      {formatCurrency(payout.amount, payout.currency)}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(payout.status) + '20' },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: getStatusColor(payout.status) }]}
                      >
                        {getStatusLabel(payout.status)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Détails du paiement */}
                <View style={styles.payoutDetails}>
                  <View style={styles.detailRow}>
                    <Phone size={14} color={colors.text.muted} />
                    <Text style={styles.detailText}>
                      {getNetworkLabel(payout.payout_details?.network)} - {payout.payout_details?.phone || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Calendar size={14} color={colors.text.muted} />
                    <Text style={styles.detailText}>
                      {formatDate(payout.created_at)}
                    </Text>
                  </View>
                </View>

                {/* Notes admin */}
                {payout.admin_notes && (
                  <Text style={styles.adminNotes}>
                    Note: {payout.admin_notes}
                  </Text>
                )}

                {/* Bouton d'action pour les demandes en attente */}
                {payout.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => openProcessModal(payout)}
                    >
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Traiter</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal de traitement */}
      <Modal
        visible={processModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setProcessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Traiter la demande</Text>
              <TouchableOpacity onPress={() => setProcessModalVisible(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedPayout && (
              <>
                {/* Résumé de la demande */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Organisateur</Text>
                  <Text style={styles.summaryValue}>
                    {selectedPayout.organizer?.username}
                  </Text>
                  
                  <Text style={styles.summaryLabel}>Montant</Text>
                  <Text style={styles.summaryAmount}>
                    {formatCurrency(selectedPayout.amount, selectedPayout.currency)}
                  </Text>
                  
                  <Text style={styles.summaryLabel}>Paiement vers</Text>
                  <Text style={styles.summaryValue}>
                    {getNetworkLabel(selectedPayout.payout_details?.network)} - {selectedPayout.payout_details?.phone}
                  </Text>
                </View>

                {/* Champs de traitement */}
                <Text style={styles.inputLabel}>Référence de transaction</Text>
                <TextInput
                  style={styles.input}
                  value={transactionRef}
                  onChangeText={setTransactionRef}
                  placeholder="Ex: MPESA123456789"
                  placeholderTextColor={colors.text.muted}
                />

                <Text style={styles.inputLabel}>Notes (optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  placeholder="Commentaires ou raison de rejet..."
                  placeholderTextColor={colors.text.muted}
                  multiline
                  numberOfLines={3}
                />

                {/* Boutons d'action */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.rejectButton]}
                    onPress={() => handleProcess('reject')}
                    disabled={processing}
                  >
                    <XCircle size={18} color="#fff" />
                    <Text style={styles.modalButtonText}>Rejeter</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.approveModalButton]}
                    onPress={() => handleProcess('approve')}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <CheckCircle size={18} color="#fff" />
                        <Text style={styles.modalButtonText}>Approuver</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  statAmount: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 4,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background.card,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.purple,
  },
  filterText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingTop: 0,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  organizerEmail: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  payoutDetails: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  adminNotes: {
    fontSize: 12,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  approveButton: {
    backgroundColor: colors.primary.purple,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
  summaryCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 12,
  },
  summaryValue: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  inputLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  approveModalButton: {
    backgroundColor: '#10B981',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
