import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Phone,
  Globe,
  FileText,
  BadgeCheck,
  X,
  AlertTriangle,
  Building2,
  ExternalLink,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

interface VerificationRequest {
  id: number;
  user_id: number;
  full_name: string;
  phone_number: string;
  business_name: string | null;
  business_type: string;
  id_document_url: string | null;
  selfie_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface Stats {
  pending: number;
  under_review: number;
  approved: number;
  rejected: number;
  total: number;
}

export default function AdminVerificationsScreen() {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  // Modal
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/api/verification/admin/requests', {
        params: { status: statusFilter === 'all' ? undefined : statusFilter },
      });
      setRequests(res.data.requests);
      setStats(res.data.stats);
    } catch (err) {
      console.error('Erreur chargement demandes:', err);
      Alert.alert('Erreur', 'Impossible de charger les demandes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      await api.post(`/api/verification/admin/requests/${selectedRequest.id}/approve`);
      Alert.alert('Succès', 'Organisateur vérifié avec succès');
      setModalVisible(false);
      setSelectedRequest(null);
      loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors de l\'approbation');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!rejectionReason.trim()) {
      Alert.alert('Erreur', 'Veuillez indiquer un motif de rejet');
      return;
    }

    try {
      setProcessing(true);
      await api.post(`/api/verification/admin/requests/${selectedRequest.id}/reject`, {
        rejectionReason: rejectionReason.trim(),
      });
      Alert.alert('Succès', 'Demande rejetée');
      setModalVisible(false);
      setSelectedRequest(null);
      setRejectionReason('');
      loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors du rejet');
    } finally {
      setProcessing(false);
    }
  };

  const openRequestDetails = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setModalVisible(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} color="#10B981" />;
      case 'pending':
      case 'under_review':
        return <Clock size={16} color="#F59E0B" />;
      case 'rejected':
        return <XCircle size={16} color="#EF4444" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'under_review':
        return 'En examen';
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={colors.gradients.dark as [string, string]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.primary.purple} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors.gradients.dark as [string, string]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vérifications organisateurs</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.purple} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Clock size={20} color="#F59E0B" />
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>En attente</Text>
            </View>
            <View style={styles.statCard}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.statValue}>{stats.approved}</Text>
              <Text style={styles.statLabel}>Approuvés</Text>
            </View>
            <View style={styles.statCard}>
              <XCircle size={20} color="#EF4444" />
              <Text style={styles.statValue}>{stats.rejected}</Text>
              <Text style={styles.statLabel}>Rejetés</Text>
            </View>
          </View>
        )}

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filters}>
            {['pending', 'under_review', 'approved', 'rejected', 'all'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterButton, statusFilter === status && styles.filterButtonActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
                  {status === 'all' ? 'Tous' : getStatusLabel(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Liste des demandes */}
        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BadgeCheck size={48} color={colors.text.muted} />
            <Text style={styles.emptyText}>Aucune demande</Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => openRequestDetails(request)}
              >
                <View style={styles.requestHeader}>
                  {request.user?.avatar_url ? (
                    <Image source={{ uri: request.user.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <User size={20} color={colors.text.muted} />
                    </View>
                  )}
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{request.full_name || request.user?.name}</Text>
                    <Text style={styles.requestEmail}>{request.user?.email}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                    {getStatusIcon(request.status)}
                  </View>
                </View>

                <View style={styles.requestDetails}>
                  <View style={styles.detailItem}>
                    <Phone size={14} color={colors.text.muted} />
                    <Text style={styles.detailText}>{request.phone_number || 'Non renseigné'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Building2 size={14} color={colors.text.muted} />
                    <Text style={styles.detailText}>
                      {request.business_type === 'individual' ? 'Individuel' : request.business_name || 'Entreprise'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.requestDate}>Soumis le {formatDate(request.created_at)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal détails */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails de la demande</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Infos utilisateur */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Informations</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Nom complet</Text>
                    <Text style={styles.infoValue}>{selectedRequest.full_name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Téléphone</Text>
                    <Text style={styles.infoValue}>{selectedRequest.phone_number}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Type</Text>
                    <Text style={styles.infoValue}>
                      {selectedRequest.business_type === 'individual' ? 'Individuel' : 
                       selectedRequest.business_type === 'company' ? 'Entreprise' : 'Association'}
                    </Text>
                  </View>
                  {selectedRequest.business_name && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Structure</Text>
                      <Text style={styles.infoValue}>{selectedRequest.business_name}</Text>
                    </View>
                  )}
                </View>

                {/* Documents */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Documents</Text>
                  {selectedRequest.id_document_url ? (
                    <Image source={{ uri: selectedRequest.id_document_url }} style={styles.documentImage} />
                  ) : (
                    <Text style={styles.noDocument}>Aucun document fourni</Text>
                  )}
                </View>

                {/* Liens */}
                {(selectedRequest.facebook_url || selectedRequest.instagram_url || selectedRequest.website_url) && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Présence en ligne</Text>
                    {selectedRequest.facebook_url && (
                      <View style={styles.linkRow}>
                        <Globe size={16} color={colors.text.muted} />
                        <Text style={styles.linkText} numberOfLines={1}>{selectedRequest.facebook_url}</Text>
                      </View>
                    )}
                    {selectedRequest.instagram_url && (
                      <View style={styles.linkRow}>
                        <Globe size={16} color={colors.text.muted} />
                        <Text style={styles.linkText} numberOfLines={1}>{selectedRequest.instagram_url}</Text>
                      </View>
                    )}
                    {selectedRequest.website_url && (
                      <View style={styles.linkRow}>
                        <Globe size={16} color={colors.text.muted} />
                        <Text style={styles.linkText} numberOfLines={1}>{selectedRequest.website_url}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Actions */}
                {selectedRequest.status === 'pending' && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Actions</Text>

                    <TextInput
                      style={styles.rejectionInput}
                      value={rejectionReason}
                      onChangeText={setRejectionReason}
                      placeholder="Motif de rejet (si rejet)"
                      placeholderTextColor={colors.text.muted}
                      multiline
                    />

                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={handleReject}
                        disabled={processing}
                      >
                        {processing ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <XCircle size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Rejeter</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={handleApprove}
                        disabled={processing}
                      >
                        {processing ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <CheckCircle size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Approuver</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Motif de rejet</Text>
                    <View style={styles.rejectionBanner}>
                      <AlertTriangle size={16} color="#EF4444" />
                      <Text style={styles.rejectionText}>{selectedRequest.rejection_reason}</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved':
      return 'rgba(16, 185, 129, 0.2)';
    case 'pending':
    case 'under_review':
      return 'rgba(245, 158, 11, 0.2)';
    case 'rejected':
      return 'rgba(239, 68, 68, 0.2)';
    default:
      return 'rgba(255, 255, 255, 0.1)';
  }
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
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
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },

  // Filters
  filtersScroll: {
    marginBottom: 16,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
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

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.muted,
    marginTop: 12,
  },

  // Requests list
  requestsList: {
    paddingHorizontal: 16,
  },
  requestCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
    marginLeft: 12,
  },
  requestName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  requestEmail: {
    fontSize: 12,
    color: colors.text.muted,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  requestDate: {
    fontSize: 11,
    color: colors.text.muted,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.dark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.muted,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  documentImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  noDocument: {
    fontSize: 14,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 13,
    color: colors.primary.purple,
    flex: 1,
  },
  rejectionInput: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  rejectionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  rejectionText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.secondary,
  },
});
