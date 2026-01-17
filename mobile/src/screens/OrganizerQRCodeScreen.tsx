import React, { useState, useEffect } from 'react';
import logger from '../lib/logger';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Download, Share2 } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

type Event = {
  id: number;
  title: string;
  organizer_qr_code: string;
  organizer_qr_code_image: string;
};

export default function OrganizerQRCodeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { eventId } = route.params;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function loadEvent() {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/api/events/${eventId}`);
      const eventData = response.data;

      // Si le QR code n'existe pas, essayer de le générer
      if (!eventData.organizer_qr_code || !eventData.organizer_qr_code_image) {
        try {
          const generateRes = await api.post(`/api/events/${eventId}/generate-organizer-qr`);
          eventData.organizer_qr_code = generateRes.data.organizer_qr_code;
          eventData.organizer_qr_code_image = generateRes.data.organizer_qr_code_image;
        } catch (genErr: any) {
          logger.error('Erreur génération QR code:', genErr);
          setError('Impossible de générer le QR code organisateur');
          return;
        }
      }

      setEvent(eventData);
    } catch (err: any) {
      logger.error('Erreur chargement QR code:', err);
      setError(err?.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }

  function handleShare() {
    Alert.alert(
      'Partager le QR code',
      'Fonctionnalité de partage à venir',
      [{ text: 'OK' }]
    );
  }

  function handleDownload() {
    Alert.alert(
      'Télécharger le QR code',
      'Fonctionnalité de téléchargement à venir',
      [{ text: 'OK' }]
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={colors.gradients.dark as [string, string]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={colors.primary.purple} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={colors.gradients.dark as [string, string]}
          style={StyleSheet.absoluteFill}
        />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Événement introuvable'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadEvent}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradients.dark as [string, string]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code Organisateur</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.subtitle}>
          Présentez ce QR code pour accéder à votre événement
        </Text>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <Image
            source={{ uri: event.organizer_qr_code_image }}
            style={styles.qrCode}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.qrCodeText}>{event.organizer_qr_code}</Text>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={20} color={colors.text.primary} />
            <Text style={styles.actionButtonText}>Partager</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
            <Download size={20} color={colors.text.primary} />
            <Text style={styles.actionButtonText}>Télécharger</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Information</Text>
          <Text style={styles.infoText}>
            Ce QR code est unique et vous permet d'accéder à votre événement en tant qu'organisateur.
            Ne le partagez pas publiquement.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: 32,
  },
  qrContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  qrCode: {
    width: 280,
    height: 280,
  },
  qrCodeText: {
    fontSize: 12,
    color: colors.text.muted,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 32,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  infoBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary.purple,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
