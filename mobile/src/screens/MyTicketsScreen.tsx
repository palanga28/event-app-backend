import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ticket, Calendar, MapPin, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

type TicketItem = {
  id: number;
  status: string;
  price_paid: number;
  purchase_date: string;
  quantity: number;
  event: {
    id: number;
    title: string;
    location: string;
    start_date: string;
    cover_image: string;
  };
  ticketType: {
    name: string;
  };
};

export default function MyTicketsScreen() {
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadTickets();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  async function loadTickets() {
    try {
      const response = await api.get('/api/tickets/user');
      setTickets(response.data || []);
    } catch (err) {
      console.error('Load tickets error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Si non connecté, afficher un message
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={colors.gradients.dark as [string, string]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.notLoggedIn}>
          <Ticket size={64} color={colors.text.muted} />
          <Text style={styles.notLoggedInTitle}>Non connecté</Text>
          <Text style={styles.notLoggedInText}>
            Connecte-toi pour voir tes billets
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={colors.gradients.primary as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Se connecter</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'valid':
        return colors.status.success;
      case 'used':
        return colors.status.info;
      case 'cancelled':
        return colors.status.error;
      default:
        return colors.text.muted;
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'valid':
        return 'Valide';
      case 'used':
        return 'Utilisé';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  }

  function renderTicket({ item }: { item: TicketItem }) {
    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketTypeContainer}>
            <Ticket size={16} color={colors.primary.purple} />
            <Text style={styles.ticketType}>{item.ticketType.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.eventTitle}>{item.event.title}</Text>

        <View style={styles.ticketInfo}>
          <View style={styles.infoRow}>
            <Calendar size={14} color={colors.text.muted} />
            <Text style={styles.infoText}>{formatDate(item.event.start_date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={14} color={colors.text.muted} />
            <Text style={styles.infoText} numberOfLines={1}>{item.event.location}</Text>
          </View>
        </View>

        <View style={styles.ticketFooter}>
          <Text style={styles.quantity}>x{item.quantity}</Text>
          <Text style={styles.price}>{item.price_paid} FC</Text>
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
        <Text style={styles.headerTitle}>Mes billets</Text>
      </View>

      <FlatList
        data={tickets}
        renderItem={renderTicket}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTickets();
            }}
            tintColor={colors.primary.purple}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ticket size={48} color={colors.text.muted} />
            <Text style={styles.emptyText}>Aucun billet</Text>
            <Text style={styles.emptySubtext}>
              Tes billets apparaîtront ici après achat
            </Text>
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
    padding: 16,
    paddingBottom: 100,
  },
  ticketCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.purple,
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
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  ticketInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  quantity: {
    fontSize: 14,
    color: colors.text.muted,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary.purple,
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
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 24,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 300,
  },
  loginButtonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
