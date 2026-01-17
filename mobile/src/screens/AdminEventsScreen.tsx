import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Calendar, Star, Trash2, Search, X, CheckCircle, Clock, Eye } from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

type Event = {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  featured?: boolean;
  organizer?: { id: number; name: string; email: string } | null;
};

export default function AdminEventsScreen() {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery, statusFilter]);

  async function loadEvents() {
    try {
      setError(null);
      const res = await api.get<Event[] | { value: Event[] }>('/api/admin/events');
      const data = Array.isArray(res.data) ? res.data : (res.data?.value || []);
      setEvents(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function filterEvents() {
    let filtered = events;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => e.title.toLowerCase().includes(query));
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    setFilteredEvents(filtered);
  }

  function onRefresh() {
    setRefreshing(true);
    loadEvents();
  }

  async function changeStatus(eventId: number, newStatus: string) {
    setActionLoading(eventId);
    try {
      await api.put(`/api/admin/events/${eventId}/status`, { status: newStatus });
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e));
      Alert.alert('Succès', `Statut mis à jour: ${newStatus}`);
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur modification statut');
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleFeatured(event: Event) {
    setActionLoading(event.id);
    const newFeatured = !event.featured;
    try {
      await api.put(`/api/admin/events/${event.id}/featured`, { featured: newFeatured });
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, featured: newFeatured } : e));
      Alert.alert('Succès', newFeatured ? 'Événement mis en vedette' : 'Événement retiré de la vedette');
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur modification vedette');
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteEvent(eventId: number, eventTitle: string) {
    Alert.alert(
      'Supprimer l\'événement',
      `Êtes-vous sûr de vouloir supprimer "${eventTitle}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(eventId);
            try {
              await api.delete(`/api/admin/events/${eventId}`);
              setEvents(prev => prev.filter(e => e.id !== eventId));
              Alert.alert('Succès', 'Événement supprimé');
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Erreur suppression');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Chargement des événements...</Text>
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

  const statusColors: Record<string, string> = {
    published: '#10b981',
    draft: '#6b7280',
    cancelled: '#ef4444',
  };

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
              colors={['rgba(168, 85, 247, 0.2)', 'rgba(147, 51, 234, 0.2)']}
              style={styles.headerIconGradient}
            >
              <Calendar size={24} color="#a855f7" />
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Événements</Text>
            <Text style={styles.headerSubtitle}>{filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={18} color={colors.text.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un événement..."
              placeholderTextColor={colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status Filter */}
        <View style={styles.filterContainer}>
          {['all', 'published', 'draft', 'cancelled'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterTab, statusFilter === status && styles.filterTabActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterTabText, statusFilter === status && styles.filterTabTextActive]}>
                {status === 'all' ? 'Tous' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Events List */}
        <View style={styles.eventsList}>
          {filteredEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <TouchableOpacity
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                style={styles.eventHeader}
              >
                <View style={styles.eventTitleRow}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                  {event.featured && (
                    <View style={styles.featuredBadge}>
                      <Star size={12} color="#fbbf24" fill="#fbbf24" />
                    </View>
                  )}
                </View>
                <View style={styles.eventMeta}>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColors[event.status] || '#6b7280'}20` }]}>
                    <Text style={[styles.statusText, { color: statusColors[event.status] || '#6b7280' }]}>
                      {event.status}
                    </Text>
                  </View>
                  {event.organizer && (
                    <Text style={styles.organizerText}>Par {event.organizer.name}</Text>
                  )}
                </View>
                <Text style={styles.eventDate}>
                  {new Date(event.start_date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>

              {/* Actions */}
              <View style={styles.eventActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                >
                  <Eye size={14} color={colors.primary.purple} />
                  <Text style={styles.actionButtonText}>Voir</Text>
                </TouchableOpacity>

                {event.status === 'draft' ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonSuccess]}
                    onPress={() => changeStatus(event.id, 'published')}
                    disabled={actionLoading === event.id}
                  >
                    <CheckCircle size={14} color="#10b981" />
                    <Text style={[styles.actionButtonText, { color: '#10b981' }]}>Publier</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonWarning]}
                    onPress={() => changeStatus(event.id, 'draft')}
                    disabled={actionLoading === event.id}
                  >
                    <Clock size={14} color="#f59e0b" />
                    <Text style={[styles.actionButtonText, { color: '#f59e0b' }]}>Brouillon</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, event.featured && styles.actionButtonActive]}
                  onPress={() => toggleFeatured(event)}
                  disabled={actionLoading === event.id}
                >
                  <Star size={14} color={event.featured ? '#fbbf24' : colors.text.muted} fill={event.featured ? '#fbbf24' : 'none'} />
                  <Text style={[styles.actionButtonText, event.featured && { color: '#fbbf24' }]}>
                    {event.featured ? 'Vedette' : 'Vedette'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  onPress={() => deleteEvent(event.id, event.title)}
                  disabled={actionLoading === event.id}
                >
                  <Trash2 size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {actionLoading === event.id && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={colors.primary.purple} />
                </View>
              )}
            </View>
          ))}
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
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary.purple,
    borderColor: colors.primary.purple,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.muted,
  },
  filterTabTextActive: {
    color: colors.text.primary,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  eventHeader: {
    marginBottom: 12,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 22,
  },
  featuredBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  organizerText: {
    fontSize: 12,
    color: colors.text.muted,
  },
  eventDate: {
    fontSize: 12,
    color: colors.text.muted,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 8,
  },
  actionButtonSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionButtonWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  actionButtonDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    flex: 0,
    paddingHorizontal: 10,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary.purple,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
