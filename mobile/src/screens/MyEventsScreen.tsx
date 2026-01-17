import React, { useState, useEffect } from 'react';
import logger from '../lib/logger';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin, ArrowLeft, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type Event = {
  id: number;
  title: string;
  location: string;
  start_date: string;
  cover_image: string;
  status: string;
};

export default function MyEventsScreen() {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const response = await api.get('/api/events/mine');
      // L'API retourne directement un tableau, pas un objet avec events
      const eventsData = Array.isArray(response.data) ? response.data : (response.data.events || []);
      setEvents(eventsData);
    } catch (err) {
      logger.error('Load my events error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'published':
        return colors.status.success;
      case 'draft':
        return colors.status.warning;
      case 'cancelled':
        return colors.status.error;
      default:
        return colors.text.muted;
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'published':
        return 'Publié';
      case 'draft':
        return 'Brouillon';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  }

  function renderEventCard({ item }: { item: Event }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.cover_image || 'https://via.placeholder.com/300x200' }}
          style={styles.cardImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.cardGradient}
        />
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '30' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.cardInfo}>
            <Calendar size={12} color={colors.text.secondary} />
            <Text style={styles.cardInfoText}>{formatDate(item.start_date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradients.dark as [string, string]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes événements</Text>
      </View>

      <FlatList
        data={events}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadEvents();
            }}
            tintColor={colors.primary.purple}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Plus size={48} color={colors.text.muted} />
            <Text style={styles.emptyText}>Aucun événement</Text>
            <Text style={styles.emptySubtext}>
              Tu n'as pas encore créé d'événement
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateEvent')}
            >
              <LinearGradient
                colors={colors.gradients.primary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButtonGradient}
              >
                <Plus size={20} color={colors.text.primary} />
                <Text style={styles.createButtonText}>Créer un événement</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.background.card,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardInfoText: {
    fontSize: 11,
    color: colors.text.secondary,
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
    width: 200,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
