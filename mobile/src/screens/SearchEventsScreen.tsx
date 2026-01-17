import React, { useState, useEffect } from 'react';
import logger from '../lib/logger';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Search, X, SlidersHorizontal, Calendar, MapPin, DollarSign, Check, Clock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

type Event = {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  location: string | null;
  cover_image: string | null;
  images?: string[] | null;
  featured?: boolean;
  organizer?: {
    id: number;
    name: string;
    email: string;
  };
};

type Filters = {
  category: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  priceMin: string;
  priceMax: string;
};

const CATEGORIES = [
  'Tous',
  'Musique',
  'Sport',
  'Art & Culture',
  'Technologie',
  'Business',
  'Food & Drink',
  'Santé & Bien-être',
  'Éducation',
  'Autre',
];

export default function SearchEventsScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    category: null,
    dateFrom: null,
    dateTo: null,
    priceMin: '',
    priceMax: '',
  });
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  
  // Date picker states
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      searchEvents();
    } else {
      setEvents([]);
    }
  }, [searchQuery, filters]);

  useEffect(() => {
    // Compter les filtres actifs
    let count = 0;
    if (filters.category && filters.category !== 'Tous') count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.priceMin || filters.priceMax) count++;
    setActiveFiltersCount(count);
  }, [filters]);

  async function searchEvents() {
    if (!searchQuery.trim()) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('q', searchQuery.trim());
      params.set('limit', '50');

      // Ajouter les filtres aux paramètres de recherche
      if (filters.category && filters.category !== 'Tous') {
        params.set('category', filters.category);
      }
      if (filters.dateFrom) {
        params.set('dateFrom', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        params.set('dateTo', filters.dateTo.toISOString());
      }
      if (filters.priceMin) {
        params.set('priceMin', filters.priceMin);
      }
      if (filters.priceMax) {
        params.set('priceMax', filters.priceMax);
      }

      const response = await api.get(`/api/events/search?${params.toString()}`);
      const data = Array.isArray(response.data) ? response.data : (response.data?.value || []);
      setEvents(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur de recherche');
      logger.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setFilters({
      category: null,
      dateFrom: null,
      dateTo: null,
      priceMin: '',
      priceMax: '',
    });
  }

  function applyFilters() {
    setShowFilters(false);
    if (searchQuery.trim().length > 0) {
      searchEvents();
    }
  }

  function clearSearch() {
    setSearchQuery('');
    setEvents([]);
    setError(null);
  }

  function renderEventCard({ item }: { item: Event }) {
    const images = Array.isArray(item.images) ? item.images.filter(Boolean) : [];
    const heroImage = images.length > 0 ? images[0] : item.cover_image;

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
          style={styles.eventCardGradient}
        >
          {heroImage && (
            <Image
              source={{ uri: heroImage }}
              style={styles.eventImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.eventContent}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.featured && (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredText}>Featured</Text>
                </View>
              )}
            </View>

            {item.location && (
              <View style={styles.eventInfo}>
                <MapPin size={14} color={colors.text.muted} />
                <Text style={styles.eventInfoText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            )}

            <View style={styles.eventInfo}>
              <Calendar size={14} color={colors.text.muted} />
              <Text style={styles.eventInfoText}>
                {new Date(item.start_date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>

            {item.organizer && (
              <Text style={styles.organizerText} numberOfLines={1}>
                Par {item.organizer.name}
              </Text>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  function renderEmptyState() {
    if (loading) return null;

    if (searchQuery.trim().length === 0) {
      return (
        <View style={styles.emptyState}>
          <Search size={64} color={colors.text.muted} />
          <Text style={styles.emptyTitle}>Rechercher des événements</Text>
          <Text style={styles.emptyText}>
            Entre un mot-clé pour trouver des événements
          </Text>
        </View>
      );
    }

    if (events.length === 0 && !loading) {
      return (
        <View style={styles.emptyState}>
          <Search size={64} color={colors.text.muted} />
          <Text style={styles.emptyTitle}>Aucun résultat</Text>
          <Text style={styles.emptyText}>
            Essaie avec d'autres mots-clés
          </Text>
        </View>
      );
    }

    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradients.dark as [string, string]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.text.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un événement..."
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={searchEvents}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={20} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters button */}
        <TouchableOpacity
          style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <SlidersHorizontal size={20} color={colors.text.primary} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={colors.gradients.dark as [string, string]}
              style={StyleSheet.absoluteFill}
            />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Category Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Catégorie</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        (filters.category === category || (category === 'Tous' && !filters.category)) &&
                          styles.categoryChipActive,
                      ]}
                      onPress={() =>
                        setFilters({ ...filters, category: category === 'Tous' ? null : category })
                      }
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          (filters.category === category || (category === 'Tous' && !filters.category)) &&
                            styles.categoryChipTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Price Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Prix (FCFA)</Text>
                <View style={styles.priceInputs}>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.priceInputLabel}>Min</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0"
                      placeholderTextColor={colors.text.muted}
                      value={filters.priceMin}
                      onChangeText={(text) => setFilters({ ...filters, priceMin: text })}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={styles.priceSeparator}>-</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.priceInputLabel}>Max</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="∞"
                      placeholderTextColor={colors.text.muted}
                      value={filters.priceMax}
                      onChangeText={(text) => setFilters({ ...filters, priceMax: text })}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Date Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Date</Text>
                <View style={styles.dateFilters}>
                  {/* Date From */}
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDateFromPicker(true)}
                  >
                    <Calendar size={18} color={colors.text.muted} />
                    <Text style={styles.dateButtonText}>
                      {filters.dateFrom
                        ? filters.dateFrom.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                        : 'Date début'}
                    </Text>
                    {filters.dateFrom && (
                      <TouchableOpacity
                        onPress={() => setFilters({ ...filters, dateFrom: null })}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <X size={16} color={colors.text.muted} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.dateSeparator}>→</Text>

                  {/* Date To */}
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDateToPicker(true)}
                  >
                    <Calendar size={18} color={colors.text.muted} />
                    <Text style={styles.dateButtonText}>
                      {filters.dateTo
                        ? filters.dateTo.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                        : 'Date fin'}
                    </Text>
                    {filters.dateTo && (
                      <TouchableOpacity
                        onPress={() => setFilters({ ...filters, dateTo: null })}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <X size={16} color={colors.text.muted} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Quick date filters */}
                <View style={styles.quickDateFilters}>
                  <TouchableOpacity
                    style={styles.quickDateButton}
                    onPress={() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setFilters({ ...filters, dateFrom: today, dateTo: tomorrow });
                    }}
                  >
                    <Text style={styles.quickDateText}>Aujourd'hui</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickDateButton}
                    onPress={() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const endOfWeek = new Date(today);
                      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
                      setFilters({ ...filters, dateFrom: today, dateTo: endOfWeek });
                    }}
                  >
                    <Text style={styles.quickDateText}>Cette semaine</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickDateButton}
                    onPress={() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                      setFilters({ ...filters, dateFrom: today, dateTo: endOfMonth });
                    }}
                  >
                    <Text style={styles.quickDateText}>Ce mois</Text>
                  </TouchableOpacity>
                </View>

                {/* Date Pickers */}
                {showDateFromPicker && (
                  <DateTimePicker
                    value={filters.dateFrom || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowDateFromPicker(Platform.OS === 'ios');
                      if (date) {
                        setFilters({ ...filters, dateFrom: date });
                      }
                    }}
                    minimumDate={new Date()}
                  />
                )}
                {showDateToPicker && (
                  <DateTimePicker
                    value={filters.dateTo || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowDateToPicker(Platform.OS === 'ios');
                      if (date) {
                        setFilters({ ...filters, dateTo: date });
                      }
                    }}
                    minimumDate={filters.dateFrom || new Date()}
                  />
                )}
              </View>

              {/* Location Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Lieu</Text>
                <View style={styles.locationFilters}>
                  {['Tous', 'Kinshasa', 'Lubumbashi', 'Goma', 'Bukavu', 'Autre'].map((location) => (
                    <TouchableOpacity
                      key={location}
                      style={[
                        styles.locationChip,
                        filters.category === `loc_${location}` && styles.locationChipActive,
                      ]}
                      onPress={() => {
                        if (location === 'Tous') {
                          setFilters({ ...filters, category: filters.category?.startsWith('loc_') ? null : filters.category });
                        } else {
                          setFilters({ ...filters, category: `loc_${location}` });
                        }
                      }}
                    >
                      <MapPin size={14} color={filters.category === `loc_${location}` ? colors.text.primary : colors.text.muted} />
                      <Text
                        style={[
                          styles.locationChipText,
                          filters.category === `loc_${location}` && styles.locationChipTextActive,
                        ]}
                      >
                        {location}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <LinearGradient
                  colors={colors.gradients.primary as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyButtonGradient}
                >
                  <Text style={styles.applyButtonText}>Appliquer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Results count */}
      {events.length > 0 && !loading && (
        <View style={styles.resultsCount}>
          <Text style={styles.resultsCountText}>
            {events.length} événement{events.length > 1 ? 's' : ''} trouvé{events.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.purple} />
          <Text style={styles.loadingText}>Recherche en cours...</Text>
        </View>
      )}

      {/* Results list */}
      <FlatList
        data={events}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    borderColor: colors.primary.purple,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary.purple,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: colors.text.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.dark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: colors.primary.purple,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: colors.primary.purple,
    fontWeight: '600',
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 8,
  },
  priceInput: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 16,
  },
  priceSeparator: {
    color: colors.text.muted,
    fontSize: 18,
    marginTop: 20,
  },
  comingSoonText: {
    color: colors.text.muted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  dateFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
  },
  dateSeparator: {
    color: colors.text.muted,
    fontSize: 16,
  },
  quickDateFilters: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickDateButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  quickDateText: {
    fontSize: 13,
    color: colors.primary.purple,
    fontWeight: '500',
  },
  locationFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  locationChipActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: colors.primary.purple,
  },
  locationChipText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  locationChipTextActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  resetButton: {
    flex: 1,
    height: 48,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  resultsCount: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  resultsCountText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  errorContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: colors.status.error,
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  eventCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  eventCardGradient: {
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.background.card,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 24,
  },
  featuredBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featuredText: {
    color: '#FCD34D',
    fontSize: 11,
    fontWeight: '600',
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  eventInfoText: {
    color: colors.text.secondary,
    fontSize: 14,
    flex: 1,
  },
  organizerText: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
