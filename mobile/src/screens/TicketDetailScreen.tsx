import React, { useState, useEffect } from 'react';
import logger from '../lib/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../lib/api';

interface TicketDetail {
  id: number;
  status: string;
  purchase_date: string;
  price_paid: number;
  quantity: number;
  qr_code: string;
  qr_code_image: string;
  validated_at?: string;
  event: {
    id: number;
    title: string;
    date?: string;
    start_date?: string;
    location: string;
    images?: string | string[];
    cover_image?: string;
  };
  ticketType: {
    id: number;
    name: string;
    price: number;
    currency: string;
  };
}

export default function TicketDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { ticketId } = route.params as { ticketId: number };

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/tickets/${ticketId}`);
      setTicket(response.data);
    } catch (error: any) {
      logger.error('Erreur chargement ticket:', error);
      Alert.alert('Erreur', 'Impossible de charger le ticket');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!ticket) return;

    try {
      await Share.share({
        message: `Mon ticket pour ${ticket.event.title}\nDate: ${new Date(ticket.event.date || ticket.event.start_date || new Date()).toLocaleDateString('fr-FR')}\nLieu: ${ticket.event.location}`,
      });
    } catch (error) {
      logger.error('Erreur partage:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'used':
        return '#6366f1';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'used':
        return 'Utilisé';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Chargement du ticket...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Ticket non trouvé</Text>
      </View>
    );
  }

  const eventDate = new Date(ticket.event.date || ticket.event.start_date || new Date());
  
  // Gérer les images (peut être un tableau ou une string JSON)
  let eventImages: string[] = [];
  if (ticket.event.images) {
    if (Array.isArray(ticket.event.images)) {
      eventImages = ticket.event.images;
    } else if (typeof ticket.event.images === 'string') {
      try {
        eventImages = JSON.parse(ticket.event.images);
      } catch {
        eventImages = [];
      }
    }
  }
  const eventImage = eventImages.length > 0 ? eventImages[0] : ticket.event.cover_image;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Ticket</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Image */}
        {eventImage && (
          <Image source={{ uri: eventImage }} style={styles.eventImage} />
        )}

        {/* Ticket Card */}
        <View style={styles.ticketCard}>
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
            <Text style={styles.statusText}>{getStatusText(ticket.status)}</Text>
          </View>

          {/* Event Info */}
          <Text style={styles.eventTitle}>{ticket.event.title}</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
            <Text style={styles.infoText}>
              {eventDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#6b7280" />
            <Text style={styles.infoText}>
              {eventDate.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#6b7280" />
            <Text style={styles.infoText}>{ticket.event.location}</Text>
          </View>

          <View style={styles.divider} />

          {/* Ticket Type */}
          <View style={styles.ticketTypeRow}>
            <View>
              <Text style={styles.ticketTypeLabel}>Type de ticket</Text>
              <Text style={styles.ticketTypeName}>{ticket.ticketType.name}</Text>
            </View>
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>x{ticket.quantity}</Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Prix payé</Text>
            <Text style={styles.priceValue}>
              {ticket.price_paid.toLocaleString()} {ticket.ticketType.currency}
            </Text>
          </View>

          {/* QR Code */}
          {ticket.status === 'active' && ticket.qr_code_image && (
            <>
              <View style={styles.divider} />
              <View style={styles.qrCodeSection}>
                <Text style={styles.qrCodeTitle}>QR Code d'entrée</Text>
                <Text style={styles.qrCodeSubtitle}>
                  Présentez ce code à l'entrée de l'événement
                </Text>
                <View style={styles.qrCodeContainer}>
                  <Image
                    source={{ uri: ticket.qr_code_image }}
                    style={styles.qrCodeImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.qrCodeCode}>{ticket.qr_code}</Text>
              </View>
            </>
          )}

          {/* Validation Info */}
          {ticket.status === 'used' && ticket.validated_at && (
            <>
              <View style={styles.divider} />
              <View style={styles.validationInfo}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <Text style={styles.validationText}>
                  Validé le{' '}
                  {new Date(ticket.validated_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </>
          )}

          {/* Purchase Info */}
          <View style={styles.divider} />
          <View style={styles.purchaseInfo}>
            <Text style={styles.purchaseLabel}>Acheté le</Text>
            <Text style={styles.purchaseDate}>
              {new Date(ticket.purchase_date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
          <Text style={styles.helpText}>
            En cas de problème, contactez l'organisateur ou notre support
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#6366f1',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  shareButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  ticketCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  ticketTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketTypeLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  ticketTypeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  quantityBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366f1',
  },
  qrCodeSection: {
    alignItems: 'center',
  },
  qrCodeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  qrCodeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  qrCodeContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  qrCodeImage: {
    width: 200,
    height: 200,
  },
  qrCodeCode: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 12,
    fontFamily: 'monospace',
  },
  validationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
  },
  validationText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 12,
    flex: 1,
  },
  purchaseInfo: {
    alignItems: 'center',
  },
  purchaseLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  purchaseDate: {
    fontSize: 14,
    color: '#374151',
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: '600',
  },
});
