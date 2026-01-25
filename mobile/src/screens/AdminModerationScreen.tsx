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
  Calendar,
  MapPin,
  User,
  X,
  AlertTriangle,
  Eye,
  BadgeCheck,
  Ban,
  RotateCcw,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

interface Event {
  id: number;
  title: string;
  description: string;
  cover_image: string;
  start_date: string;
  end_date: string;
  location: string;
  status: string;
  rejection_reason: string | null;
  submitted_at: string | null;
  created_at: string;
  organizer: {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    is_verified_organizer: boolean;
  } | null;
}

interface Stats {
  draft: number;
  pending_review: number;
  published: number;
  rejected: number;
  suspended: number;
  total: number;
}

export default function AdminModerationScreen() {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending_review');

  // Modal
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/api/moderation/events', {
        params: { status: statusFilter === 'all' ? undefined : statusFilter },
      });
      setEvents(res.data.events);
      setStats(res.data.stats);
    } catch (err) {
      console.error('Erreur chargement événements:', err);
      Alert.alert('Erreur', 'Impossible de charger les événements');
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
    if (!selectedEvent) return;

    try {
      setProcessing(true);
      await api.post(`/api/moderation/events/${selectedEvent.id}/approve`);
      Alert.alert('Succès', 'Événement approuvé et publié');
      setModalVisible(false);
      setSelectedEvent(null);
      loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors de l\'approbation');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEvent) return;

    if (!rejectionReason.trim()) {
      Alert.alert('Erreur', 'Veuillez indiquer un motif de rejet');
      return;
    }

    try {
      setProcessing(true);
      await api.post(`/api/moderation/events/${selectedEvent.id}/reject`, {
        reason: rejectionReason.trim(),
      });
      Alert.alert('Succès', 'Événement rejeté');
      setModalVisible(false);
      setSelectedEvent(null);
      setRejectionReason('');
      loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors du rejet');
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedEvent) return;

    if (!rejectionReason.trim()) {
      Alert.alert('Erreur', 'Veuillez indiquer un motif de suspension');
      return;
    }

    try {
      setProcessing(true);
      await api.post(`/api/moderation/events/${selectedEvent.id}/suspend`, {
        reason: rejectionReason.trim(),
      });
      Alert.alert('Succès', 'Événement suspendu');
      setModalVisible(false);
      setSelectedEvent(null);
      setRejectionReason('');
      loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors de la suspension');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedEvent) return;

    try {
      setProcessing(true);
      await api.post(`/api/moderation/events/${selectedEvent.id}/restore`);
      Alert.alert('Succès', 'Événement restauré');
      setModalVisible(false);
      setSelectedEvent(null);
      loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors de la restauration');
    } finally {
      setProcessing(false);
    }
  };

  const openEventDetails = (event: Event) => {
    setSelectedEvent(event);
    setRejectionReason('');
    setModalVisible(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle size={16} color="#10B981" />;
      case 'pending_review':
        return <Clock size={16} color="#F59E0B" />;
      case 'rejected':
        return <XCircle size={16} color="#EF4444" />;
      case 'suspended':
        return <Ban size={16} color="#EF4444" />;
      case 'draft':
        return <Eye size={16} color={colors.text.muted} />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Brouillon';
      case 'pending_review':
        return 'En attente';
      case 'published':
        return 'Publié';
      case 'rejected':
        return 'Rejeté';
      case 'suspended':
        return 'Suspendu';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'published':
        return 'rgba(16, 185, 129, 0.2)';
      case 'pending_review':
        return 'rgba(245, 158, 11, 0.2)';
      case 'rejected':
      case 'suspended':
        return 'rgba(239, 68, 68, 0.2)';
      default:
        return 'rgba(255, 255, 255, 0.1)';
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
        <Text style={styles.headerTitle}>Modération événements</Text>
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
              <Text style={styles.statValue}>{stats.pending_review}</Text>
              <Text style={styles.statLabel}>En attente</Text>
            </View>
            <View style={styles.statCard}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.statValue}>{stats.published}</Text>
              <Text style={styles.statLabel}>Publiés</Text>
            </View>
            <View style={styles.statCard}>
              <XCircle size={20} color="#EF4444" />
              <Text style={styles.statValue}>{stats.rejected + stats.suspended}</Text>
              <Text style={styles.statLabel}>Rejetés</Text>
            </View>
          </View>
        )}

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filters}>
            {['pending_review', 'published', 'rejected', 'suspended', 'draft', 'all'].map((status) => (
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

        {/* Liste des événements */}
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Calendar size={48} color={colors.text.muted} />
            <Text style={styles.emptyText}>Aucun événement</Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => openEventDetails(event)}
              >
                <Image
                  source={{ uri: event.cover_image }}
                  style={styles.eventImage}
                  defaultSource={require('../../assets/icon.png')}
                />
                <View style={styles.eventContent}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
                      {getStatusIcon(event.status)}
                    </View>
                  </View>

                  <View style={styles.eventDetails}>
                    <View style={styles.detailItem}>
                      <Calendar size={12} color={colors.text.muted} />
                      <Text style={styles.detailText}>{formatDate(event.start_date)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <MapPin size={12} color={colors.text.muted} />
                      <Text style={styles.detailText} numberOfLines={1}>{event.location || 'Non spécifié'}</Text>
                    </View>
                  </View>

                  <View style={styles.organizerRow}>
                    <User size={12} color={colors.text.muted} />
                    <Text style={styles.organizerName} numberOfLines={1}>
                      {event.organizer?.name || 'Inconnu'}
                    </Text>
                    {event.organizer?.is_verified_organizer && (
                      <BadgeCheck size={14} color="#10B981" />
                    )}
                  </View>
                </View>
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
              <Text style={styles.modalTitle}>Détails de l'événement</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedEvent && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Image */}
                <Image source={{ uri: selectedEvent.cover_image }} style={styles.modalImage} />

                {/* Infos */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalEventTitle}>{selectedEvent.title}</Text>
                  <Text style={styles.modalEventDescription} numberOfLines={4}>
                    {selectedEvent.description || 'Pas de description'}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <View style={styles.infoRow}>
                    <Calendar size={16} color={colors.text.muted} />
                    <Text style={styles.infoText}>{formatDate(selectedEvent.start_date)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MapPin size={16} color={colors.text.muted} />
                    <Text style={styles.infoText}>{selectedEvent.location || 'Non spécifié'}</Text>
                  </View>
                </View>

                {/* Organisateur */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Organisateur</Text>
                  <View style={styles.organizerInfo}>
                    <User size={16} color={colors.text.muted} />
                    <Text style={styles.organizerInfoText}>{selectedEvent.organizer?.name}</Text>
                    {selectedEvent.organizer?.is_verified_organizer ? (
                      <View style={styles.verifiedBadge}>
                        <BadgeCheck size={14} color="#10B981" />
                        <Text style={styles.verifiedText}>Vérifié</Text>
                      </View>
                    ) : (
                      <View style={styles.unverifiedBadge}>
                        <AlertTriangle size={14} color="#F59E0B" />
                        <Text style={styles.unverifiedText}>Non vérifié</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Motif de rejet existant */}
                {selectedEvent.rejection_reason && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Motif de rejet</Text>
                    <View style={styles.rejectionBanner}>
                      <AlertTriangle size={16} color="#EF4444" />
                      <Text style={styles.rejectionText}>{selectedEvent.rejection_reason}</Text>
                    </View>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Actions</Text>

                  {(selectedEvent.status === 'pending_review' || selectedEvent.status === 'draft') && (
                    <>
                      <TextInput
                        style={styles.reasonInput}
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
                    </>
                  )}

                  {selectedEvent.status === 'published' && (
                    <>
                      <TextInput
                        style={styles.reasonInput}
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                        placeholder="Motif de suspension"
                        placeholderTextColor={colors.text.muted}
                        multiline
                      />
                      <TouchableOpacity
                        style={[styles.actionButton, styles.suspendButton]}
                        onPress={handleSuspend}
                        disabled={processing}
                      >
                        {processing ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ban size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Suspendre</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  {selectedEvent.status === 'suspended' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.restoreButton]}
                      onPress={handleRestore}
                      disabled={processing}
                    >
                      {processing ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <RotateCcw size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>Restaurer</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
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

  // Events list
  eventsList: {
    paddingHorizontal: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  eventImage: {
    width: 100,
    height: 100,
  },
  eventContent: {
    flex: 1,
    padding: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: 8,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDetails: {
    gap: 4,
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
    flex: 1,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  organizerName: {
    fontSize: 12,
    color: colors.text.muted,
    flex: 1,
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
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalEventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  modalEventDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  organizerInfoText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unverifiedText: {
    fontSize: 12,
    color: '#F59E0B',
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
  reasonInput: {
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
  suspendButton: {
    backgroundColor: '#EF4444',
  },
  restoreButton: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
