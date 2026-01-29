import React, { useState, useEffect } from 'react';
import logger from '../lib/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Modal,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoCalendar from 'expo-calendar';
import { Calendar, MapPin, Clock, User, Heart, Ticket, ArrowLeft, Tag, Plus, X, Flag, DollarSign, BarChart3, Share2, CalendarPlus, Bell, BadgeCheck, Star } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { EventDetailSkeleton } from '../components/SkeletonLoader';
import { CommentSection } from '../components/CommentSection';
import { AnimatedImage } from '../components/AnimatedImage';
import notificationService from '../services/notificationService';

const { width } = Dimensions.get('window');

type TicketType = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  available_quantity: number;
};

type Tag = {
  id: number;
  name: string;
  slug: string;
};

type Event = {
  id: number;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  cover_image: string;
  images: string[];
  organizer: {
    id: number;
    name: string;
    avatar_url?: string;
    is_verified_organizer?: boolean;
  };
  organizer_id: number;
  tags?: Tag[];
};

export default function EventDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { eventId } = route.params;

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Tags management
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  
  // Ticket type management
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [ticketType, setTicketType] = useState<'Standard' | 'VIP' | 'VVIP'>('Standard');
  const [ticketCurrency, setTicketCurrency] = useState<'CDF' | 'USD'>('CDF');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [ticketQuantity, setTicketQuantity] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);
  
  // Report
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  
  // Carousel request
  const [requestingCarousel, setRequestingCarousel] = useState(false);
  const [carouselRequested, setCarouselRequested] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function loadEvent() {
    try {
      setError(null);
      const [eventRes, ticketsRes] = await Promise.all([
        api.get(`/api/events/${eventId}`),
        api.get(`/api/ticket-types/event/${eventId}`),
      ]);
      
      // Parse images if it's a string
      const eventData = eventRes.data;
      if (eventData.images && typeof eventData.images === 'string') {
        try {
          eventData.images = JSON.parse(eventData.images);
        } catch (e) {
          logger.log('Failed to parse images:', e);
          eventData.images = [];
        }
      }
      
      // Ensure images is an array
      if (!Array.isArray(eventData.images)) {
        eventData.images = [];
      }
      
      setEvent(eventData);
      setTicketTypes(ticketsRes.data || []);

      // Check favorite status
      if (user) {
        try {
          const favRes = await api.get('/api/favorites');
          const favIds = favRes.data.map((f: any) => f.event_id);
          setIsFavorite(favIds.includes(eventId));
        } catch (e) {
          logger.log('Favorites check failed');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite() {
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    try {
      if (isFavorite) {
        await api.delete(`/api/favorites/${eventId}`);
      } else {
        await api.post('/api/favorites', { eventId });
      }
      setIsFavorite(!isFavorite);
    } catch (err) {
      logger.error('Toggle favorite error:', err);
    }
  }

  async function addTag() {
    if (!newTagName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de tag');
      return;
    }

    setAddingTag(true);
    try {
      await api.post(`/api/events/${eventId}/tags`, { name: newTagName.trim() });
      Alert.alert('Succès', 'Tag ajouté');
      setNewTagName('');
      setShowTagModal(false);
      loadEvent();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur ajout tag');
    } finally {
      setAddingTag(false);
    }
  }

  async function removeTag(tagId: number) {
    Alert.alert(
      'Supprimer le tag',
      'Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/events/${eventId}/tags/${tagId}`);
              Alert.alert('Succès', 'Tag supprimé');
              loadEvent();
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Erreur suppression tag');
            }
          },
        },
      ]
    );
  }

  function openEditTicket(ticket: TicketType) {
    setEditingTicket(ticket);
    setTicketType(ticket.name as 'Standard' | 'VIP' | 'VVIP');
    setTicketCurrency((ticket as any).currency || 'CDF');
    setTicketDescription(ticket.description || '');
    setTicketPrice(ticket.price.toString());
    setTicketQuantity(ticket.available_quantity.toString());
    setShowTicketModal(true);
  }

  function closeTicketModal() {
    setShowTicketModal(false);
    setEditingTicket(null);
    setTicketType('Standard');
    setTicketCurrency('CDF');
    setTicketDescription('');
    setTicketPrice('');
    setTicketQuantity('');
  }

  async function createTicketType() {
    if (!ticketPrice || !ticketQuantity) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setCreatingTicket(true);
    try {
      await api.post(`/api/events/${eventId}/ticket-types`, {
        name: ticketType,
        description: ticketDescription.trim() || null,
        price: parseFloat(ticketPrice),
        currency: ticketCurrency,
        quantity: parseInt(ticketQuantity),
      });
      Alert.alert('Succès', 'Type de ticket créé');
      closeTicketModal();
      loadEvent();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur création ticket');
    } finally {
      setCreatingTicket(false);
    }
  }

  async function updateTicketType() {
    if (!editingTicket || !ticketPrice || !ticketQuantity) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setCreatingTicket(true);
    try {
      await api.put(`/api/events/${eventId}/ticket-types/${editingTicket.id}`, {
        name: ticketType,
        description: ticketDescription.trim() || null,
        price: parseFloat(ticketPrice),
        currency: ticketCurrency,
        quantity: parseInt(ticketQuantity),
      });
      Alert.alert('Succès', 'Type de ticket modifié');
      closeTicketModal();
      loadEvent();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur modification ticket');
    } finally {
      setCreatingTicket(false);
    }
  }

  async function deleteTicketType(ticketId: number, ticketName: string) {
    Alert.alert(
      'Supprimer le billet',
      `Êtes-vous sûr de vouloir supprimer le billet "${ticketName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/events/${eventId}/ticket-types/${ticketId}`);
              Alert.alert('Succès', 'Type de ticket supprimé');
              loadEvent();
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Erreur suppression ticket');
            }
          },
        },
      ]
    );
  }

  async function reportEvent() {
    if (!reportReason.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une raison');
      return;
    }

    setReporting(true);
    try {
      await api.post('/api/reports', {
        type: 'event',
        targetId: eventId,
        reason: reportReason.trim(),
      });
      Alert.alert('Succès', 'Événement signalé');
      setReportReason('');
      setShowReportModal(false);
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur signalement');
    } finally {
      setReporting(false);
    }
  }

  const canManage = user && (user.role === 'admin' || user.id === event?.organizer_id);

  // Demander le carrousel
  async function requestCarousel() {
    if (!event || !canManage) return;
    
    Alert.alert(
      '🎠 Demande de Carrousel',
      'Voulez-vous demander que votre événement soit mis en avant dans le carrousel de la page d\'accueil ? Cette demande sera examinée par notre équipe.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Demander',
          onPress: async () => {
            setRequestingCarousel(true);
            try {
              await api.post(`/api/events/${eventId}/request-carousel`);
              setCarouselRequested(true);
              Alert.alert('✅ Demande envoyée', 'Votre demande de mise en avant dans le carrousel a été envoyée. Notre équipe l\'examinera prochainement.');
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors de la demande');
            } finally {
              setRequestingCarousel(false);
            }
          },
        },
      ]
    );
  }

  // Générer le lien de partage (deep link)
  const getEventShareUrl = () => {
    const baseUrl = 'https://ampia-events.netlify.app';
    return `${baseUrl}/event/${eventId}`;
  };

  // Partager l'événement
  async function shareEvent() {
    if (!event) return;

    const shareUrl = getEventShareUrl();
    const startDate = new Date(event.start_date);
    const formattedDate = startDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const message = `🎉 ${event.title}\n\n📅 ${formattedDate}\n📍 ${event.location}\n\n${event.description?.substring(0, 150)}${event.description?.length > 150 ? '...' : ''}\n\n👉 Voir l'événement: ${shareUrl}`;

    try {
      const result = await Share.share({
        message,
        title: event.title,
      });

      if (result.action === Share.sharedAction) {
        logger.log('Événement partagé');
      }
    } catch (error) {
      logger.error('Erreur partage:', error);
      Alert.alert('Erreur', 'Impossible de partager l\'événement');
    }
  }

  // Partager sur WhatsApp spécifiquement
  async function shareOnWhatsApp() {
    if (!event) return;

    const shareUrl = getEventShareUrl();
    const startDate = new Date(event.start_date);
    const formattedDate = startDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const message = `🎉 *${event.title}*\n\n📅 ${formattedDate}\n📍 ${event.location}\n\n👉 ${shareUrl}`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback vers le partage standard
        shareEvent();
      }
    } catch (error) {
      logger.error('Erreur WhatsApp:', error);
      shareEvent();
    }
  }

  // Ouvrir dans le navigateur (pour le deep linking)
  async function openInBrowser() {
    const shareUrl = getEventShareUrl();
    try {
      await Linking.openURL(shareUrl);
    } catch (error) {
      logger.error('Erreur ouverture URL:', error);
    }
  }

  // Ajouter au calendrier
  async function addToCalendar() {
    if (!event) return;

    try {
      // Demander la permission d'accès au calendrier
      const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'L\'accès au calendrier est nécessaire pour ajouter l\'événement.'
        );
        return;
      }

      // Obtenir les calendriers disponibles
      const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
      
      // Trouver un calendrier par défaut (préférer le calendrier principal)
      let defaultCalendar = calendars.find(
        (cal) => cal.allowsModifications && cal.isPrimary
      );
      
      if (!defaultCalendar) {
        defaultCalendar = calendars.find((cal) => cal.allowsModifications);
      }

      if (!defaultCalendar) {
        Alert.alert('Erreur', 'Aucun calendrier disponible pour ajouter l\'événement.');
        return;
      }

      // Créer l'événement dans le calendrier
      const startDate = new Date(event.start_date);
      const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2h par défaut

      const eventDetails = {
        title: event.title,
        startDate,
        endDate,
        location: event.location,
        notes: event.description,
        timeZone: 'Africa/Kinshasa',
      };

      await ExpoCalendar.createEventAsync(defaultCalendar.id, eventDetails);

      Alert.alert(
        '✅ Ajouté au calendrier',
        `L'événement "${event.title}" a été ajouté à votre calendrier.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      logger.error('Erreur ajout calendrier:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'événement au calendrier.');
    }
  }

  // Activer le rappel de notification
  async function setEventReminder() {
    if (!event) return;

    const eventDate = new Date(event.start_date);
    
    // Vérifier si l'événement n'est pas déjà passé
    if (eventDate <= new Date()) {
      Alert.alert('Événement passé', 'Cet événement a déjà eu lieu.');
      return;
    }

    // Vérifier les permissions de notifications (pas besoin du token push pour les rappels locaux)
    const hasPermission = await notificationService.checkAndRequestPermissions();
    
    if (!hasPermission) {
      Alert.alert(
        '⚠️ Notifications désactivées',
        'Veuillez activer les notifications dans les paramètres de votre téléphone pour recevoir des rappels.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      '🔔 Définir un rappel',
      'Quand souhaitez-vous être rappelé ?',
      [
        {
          text: 'Test (5 sec)',
          onPress: async () => {
            try {
              await notificationService.scheduleLocalNotification(
                '🔔 Test de rappel',
                `Ceci est un test pour ${event.title}`,
                5
              );
              Alert.alert('✅ Test envoyé', 'Vous devriez recevoir une notification dans 5 secondes.');
            } catch (error) {
              logger.error('Erreur test:', error);
              Alert.alert('❌ Erreur', 'Le test a échoué.');
            }
          },
        },
        {
          text: '1 heure avant',
          onPress: async () => {
            try {
              // Vérifier que le rappel n'est pas trop proche
              const reminderTime = new Date(eventDate.getTime() - 60 * 60 * 1000);
              if (reminderTime <= new Date()) {
                Alert.alert('⚠️ Trop tard', 'L\'événement commence dans moins d\'une heure.');
                return;
              }
              
              const id = await notificationService.scheduleEventReminder(
                event.id,
                event.title,
                eventDate,
                60
              );
              if (id) {
                Alert.alert('✅ Rappel activé', `Vous serez notifié 1 heure avant l'événement.\n\nDate du rappel: ${reminderTime.toLocaleString('fr-FR')}`);
              } else {
                Alert.alert('❌ Erreur', 'Impossible de planifier le rappel. Vérifiez les permissions de notifications.');
              }
            } catch (error) {
              logger.error('Erreur rappel:', error);
              Alert.alert('❌ Erreur', 'Une erreur est survenue lors de la planification du rappel.');
            }
          },
        },
        {
          text: '24 heures avant',
          onPress: async () => {
            try {
              // Vérifier que le rappel n'est pas trop proche
              const reminderTime = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
              if (reminderTime <= new Date()) {
                Alert.alert('⚠️ Trop tard', 'L\'événement commence dans moins de 24 heures. Choisissez "1 heure avant".');
                return;
              }
              
              const id = await notificationService.scheduleEventReminder(
                event.id,
                event.title,
                eventDate,
                24 * 60
              );
              if (id) {
                Alert.alert('✅ Rappel activé', `Vous serez notifié 24 heures avant l'événement.\n\nDate du rappel: ${reminderTime.toLocaleString('fr-FR')}`);
              } else {
                Alert.alert('❌ Erreur', 'Impossible de planifier le rappel. Vérifiez les permissions de notifications.');
              }
            } catch (error) {
              logger.error('Erreur rappel:', error);
              Alert.alert('❌ Erreur', 'Une erreur est survenue lors de la planification du rappel.');
            }
          },
        },
        {
          text: 'Annuler',
          style: 'cancel',
        },
      ]
    );
  }

  // Auto-scroll images every 10 seconds
  useEffect(() => {
    if (!event?.images || event.images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % event.images.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [event?.images]);

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return <EventDetailSkeleton />;
  }

  if (error || !event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Événement non trouvé'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image Carousel */}
        <View style={styles.heroContainer}>
          <AnimatedImage
            uri={event.images?.[currentImageIndex] || event.cover_image || 'https://via.placeholder.com/400x300'}
            style={styles.heroImage}
            imageIndex={currentImageIndex}
          />
          <LinearGradient
            colors={['transparent', colors.background.dark]}
            style={styles.heroGradient}
          />
          
          {/* Image Indicators */}
          {event.images && event.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {event.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentImageIndex && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>
          )}
          
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>

          {/* Favorite Button */}
          <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
            <Heart
              size={24}
              color={isFavorite ? colors.primary.pink : colors.text.primary}
              fill={isFavorite ? colors.primary.pink : 'transparent'}
            />
          </TouchableOpacity>

          {/* Report Button */}
          <TouchableOpacity 
            style={[styles.favoriteButton, { right: 70 }]} 
            onPress={() => setShowReportModal(true)}
          >
            <Flag size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>

          {/* Organizer */}
          <TouchableOpacity
            style={styles.organizerContainer}
            onPress={() => navigation.navigate('UserProfile', { userId: event.organizer.id })}
          >
            <Image
              source={{
                uri: event.organizer.avatar_url || 'https://via.placeholder.com/50',
              }}
              style={styles.organizerAvatar}
            />
            <View>
              <Text style={styles.organizerLabel}>Organisé par</Text>
              <View style={styles.organizerNameRow}>
                <Text style={styles.organizerName}>{event.organizer.name}</Text>
                {event.organizer.is_verified_organizer && (
                  <BadgeCheck size={16} color="#ffffff" fill="#3b82f6" />
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Info Cards */}
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <Calendar size={20} color={colors.primary.purple} />
              <Text style={styles.infoCardLabel}>Date</Text>
              <Text style={styles.infoCardValue}>{formatDate(event.start_date)}</Text>
            </View>
            <View style={styles.infoCard}>
              <Clock size={20} color={colors.primary.pink} />
              <Text style={styles.infoCardLabel}>Heure</Text>
              <Text style={styles.infoCardValue}>{formatTime(event.start_date)}</Text>
            </View>
          </View>

          <View style={styles.infoCardFull}>
            <MapPin size={20} color={colors.primary.violet} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.infoCardLabel}>Lieu</Text>
              <Text style={styles.infoCardValue}>{event.location}</Text>
            </View>
          </View>

          {/* Share & Calendar Buttons */}
          <View style={styles.shareContainer}>
            <TouchableOpacity style={styles.shareButton} onPress={shareEvent}>
              <Share2 size={18} color={colors.text.primary} />
              <Text style={styles.shareButtonText}>Partager</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: '#25D366' }]} 
              onPress={shareOnWhatsApp}
            >
              <Text style={styles.shareButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.shareContainer}>
            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: colors.primary.purple }]} 
              onPress={addToCalendar}
            >
              <CalendarPlus size={18} color={colors.text.primary} />
              <Text style={styles.shareButtonText}>Calendrier</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: '#f59e0b' }]} 
              onPress={setEventReminder}
            >
              <Bell size={18} color={colors.text.primary} />
              <Text style={styles.shareButtonText}>Rappel</Text>
            </TouchableOpacity>
          </View>

          {/* Organizer Actions */}
          {canManage && (
            <View style={styles.organizerActions}>
              <TouchableOpacity
                style={styles.statsButton}
                onPress={() => navigation.navigate('SalesStats', { eventId: event.id })}
              >
                <BarChart3 size={20} color={colors.text.primary} />
                <Text style={styles.statsButtonText}>Statistiques de vente</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.statsButton, { marginTop: 12 }]}
                onPress={() => navigation.navigate('OrganizerQRCode', { eventId: event.id })}
              >
                <Ticket size={20} color={colors.primary.purple} />
                <Text style={styles.statsButtonText}>Mon QR Code organisateur</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.statsButton, { marginTop: 12, opacity: carouselRequested ? 0.6 : 1 }]}
                onPress={requestCarousel}
                disabled={requestingCarousel || carouselRequested}
              >
                {requestingCarousel ? (
                  <ActivityIndicator size="small" color="#FFD700" />
                ) : (
                  <Star size={20} color="#FFD700" />
                )}
                <Text style={styles.statsButtonText}>
                  {carouselRequested ? 'Demande envoyée ✓' : 'Demander le carrousel'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tags */}
          {(event.tags && event.tags.length > 0) || canManage ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tags</Text>
                {canManage && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowTagModal(true)}
                  >
                    <Plus size={16} color={colors.primary.purple} />
                    <Text style={styles.addButtonText}>Ajouter</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.tagsContainer}>
                {event.tags?.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={styles.tagChip}
                    onLongPress={() => canManage && removeTag(tag.id)}
                  >
                    <Tag size={14} color={colors.primary.purple} />
                    <Text style={styles.tagText}>{tag.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* Tickets */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Billets</Text>
              {canManage && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowTicketModal(true)}
                >
                  <Plus size={16} color={colors.primary.purple} />
                  <Text style={styles.addButtonText}>Créer</Text>
                </TouchableOpacity>
              )}
            </View>
            {ticketTypes.length === 0 ? (
              <Text style={styles.noTickets}>Aucun billet disponible</Text>
            ) : (
              ticketTypes.map((ticket) => (
                <View key={ticket.id} style={styles.ticketCard}>
                  <View style={styles.ticketInfo}>
                    <View style={styles.ticketHeader}>
                      <Text style={styles.ticketName}>{ticket.name}</Text>
                      {canManage && (
                        <View style={styles.ticketActions}>
                          <TouchableOpacity
                            style={styles.ticketActionButton}
                            onPress={() => openEditTicket(ticket)}
                          >
                            <Text style={styles.ticketActionText}>Modifier</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.ticketActionButton, styles.ticketDeleteButton]}
                            onPress={() => deleteTicketType(ticket.id, ticket.name)}
                          >
                            <Text style={[styles.ticketActionText, styles.ticketDeleteText]}>Supprimer</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    {ticket.description && (
                      <Text style={styles.ticketDescription}>{ticket.description}</Text>
                    )}
                    <Text style={styles.ticketAvailable}>
                      {ticket.available_quantity} disponibles
                    </Text>
                  </View>
                  <View style={styles.ticketPriceContainer}>
                    <Text style={styles.ticketPrice}>
                      {ticket.price} {(ticket as any).currency || 'CDF'}
                    </Text>
                    {!canManage && (
                      <TouchableOpacity
                        style={[
                          styles.buyButton,
                          ticket.available_quantity <= 0 && styles.buyButtonDisabled,
                        ]}
                        disabled={ticket.available_quantity <= 0}
                        onPress={() => {
                          if (!user) {
                            navigation.navigate('Login');
                            return;
                          }
                          navigation.navigate('Payment', {
                            ticketType: ticket,
                            event: { id: event.id, title: event.title },
                          });
                        }}
                      >
                        <Ticket size={16} color={colors.text.primary} />
                        <Text style={styles.buyButtonText}>
                          {ticket.available_quantity <= 0 ? 'Épuisé' : 'Acheter'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Comments Section */}
          <CommentSection eventId={event.id} />
        </View>
      </ScrollView>

      {/* Add Tag Modal */}
      <Modal visible={showTagModal} transparent animationType="fade" onRequestClose={() => setShowTagModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTagModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Ajouter un tag</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nom du tag"
              placeholderTextColor={colors.text.muted}
              value={newTagName}
              onChangeText={setNewTagName}
              editable={!addingTag}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowTagModal(false)}
                disabled={addingTag}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={addTag}
                disabled={addingTag}
              >
                {addingTag ? (
                  <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.text.primary }]}>Ajouter</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create Ticket Modal */}
      <Modal visible={showTicketModal} transparent animationType="fade" onRequestClose={() => setShowTicketModal(false)}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowTicketModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>
                  {editingTicket ? 'Modifier le ticket' : 'Créer un type de ticket'}
                </Text>
                
                <Text style={styles.modalLabel}>Type de ticket</Text>
                <View style={styles.ticketTypeSelector}>
                  {(['Standard', 'VIP', 'VVIP'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.ticketTypeOption,
                        ticketType === type && styles.ticketTypeOptionActive,
                      ]}
                      onPress={() => setTicketType(type)}
                      disabled={creatingTicket}
                    >
                      <Text
                        style={[
                          styles.ticketTypeOptionText,
                          ticketType === type && styles.ticketTypeOptionTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.modalLabel}>Devise</Text>
                <View style={styles.ticketTypeSelector}>
                  {(['CDF', 'USD'] as const).map((currency) => (
                    <TouchableOpacity
                      key={currency}
                      style={[
                        styles.ticketTypeOption,
                        ticketCurrency === currency && styles.ticketTypeOptionActive,
                      ]}
                      onPress={() => setTicketCurrency(currency)}
                      disabled={creatingTicket}
                    >
                      <Text
                        style={[
                          styles.ticketTypeOptionText,
                          ticketCurrency === currency && styles.ticketTypeOptionTextActive,
                        ]}
                      >
                        {currency}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Description (optionnel)"
                  placeholderTextColor={colors.text.muted}
                  value={ticketDescription}
                  onChangeText={setTicketDescription}
                  multiline
                  editable={!creatingTicket}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Prix (FC)"
                  placeholderTextColor={colors.text.muted}
                  value={ticketPrice}
                  onChangeText={setTicketPrice}
                  keyboardType="numeric"
                  editable={!creatingTicket}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Quantité"
                  placeholderTextColor={colors.text.muted}
                  value={ticketQuantity}
                  onChangeText={setTicketQuantity}
                  keyboardType="numeric"
                  editable={!creatingTicket}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setShowTicketModal(false)}
                    disabled={creatingTicket}
                  >
                    <Text style={styles.modalButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={editingTicket ? updateTicketType : createTicketType}
                    disabled={creatingTicket}
                  >
                    {creatingTicket ? (
                      <ActivityIndicator size="small" color={colors.text.primary} />
                    ) : (
                      <Text style={[styles.modalButtonText, { color: colors.text.primary }]}>
                        {editingTicket ? 'Modifier' : 'Créer'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowReportModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Signaler cet événement</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 100 }]}
              placeholder="Raison du signalement"
              placeholderTextColor={colors.text.muted}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              textAlignVertical="top"
              editable={!reporting}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowReportModal(false)}
                disabled={reporting}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={reportEvent}
                disabled={reporting}
              >
                {reporting ? (
                  <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.text.primary }]}>Signaler</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
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
  heroContainer: {
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorActive: {
    backgroundColor: colors.primary.purple,
    width: 24,
  },
  content: {
    padding: 16,
    marginTop: -40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  organizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  organizerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  organizerLabel: {
    fontSize: 12,
    color: colors.text.muted,
  },
  organizerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  organizerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  infoCardFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 24,
  },
  infoCardLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 8,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: `${colors.primary.purple}20`,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.purple,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: `${colors.primary.purple}20`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.primary.purple}40`,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary.purple,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background.dark,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: colors.primary.purple,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.background.dark,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary.purple,
  },
  modalButtonDanger: {
    backgroundColor: '#ef4444',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.muted,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  noTickets: {
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  ticketCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 12,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  ticketDescription: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  ticketAvailable: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 8,
  },
  ticketPriceContainer: {
    alignItems: 'flex-end',
  },
  ticketPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary.purple,
    marginBottom: 8,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buyButtonDisabled: {
    backgroundColor: colors.text.muted,
  },
  buyButtonText: {
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    color: colors.status.error,
    fontSize: 16,
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
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
    marginTop: 8,
  },
  ticketTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  ticketTypeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  ticketTypeOptionActive: {
    borderColor: colors.primary.purple,
    backgroundColor: colors.primary.purple + '20',
  },
  ticketTypeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  ticketTypeOptionTextActive: {
    color: colors.primary.purple,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ticketActions: {
    flexDirection: 'row',
    gap: 8,
  },
  ticketActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.primary.purple + '20',
    borderWidth: 1,
    borderColor: colors.primary.purple,
  },
  ticketDeleteButton: {
    backgroundColor: colors.status.error + '20',
    borderColor: colors.status.error,
  },
  ticketActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.purple,
  },
  ticketDeleteText: {
    color: colors.status.error,
  },
  organizerActions: {
    marginBottom: 16,
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  statsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  shareContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.background.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
