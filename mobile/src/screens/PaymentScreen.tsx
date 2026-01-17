import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  CreditCard, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowLeft,
  Ticket,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

type PaymentStatus = 'idle' | 'initiating' | 'processing' | 'completed' | 'failed';

// MODE TEST - Mettre à false pour activer le paiement réel
const TEST_MODE = true;

export default function PaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { ticketType, event } = route.params || {};

  const [quantity, setQuantity] = useState(1);
  const [mobileNumber, setMobileNumber] = useState('');
  const [currency, setCurrency] = useState<'CDF' | 'USD'>('CDF');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);

  const totalAmount = ticketType ? ticketType.price * quantity : 0;

  // Polling pour vérifier le statut du paiement
  useEffect(() => {
    if (status !== 'processing' || !transactionRef) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get(`/api/payments/status/${transactionRef}`);
        const paymentStatus = res.data.status;

        if (paymentStatus === 'completed') {
          setStatus('completed');
          clearInterval(pollInterval);
        } else if (paymentStatus === 'failed') {
          setStatus('failed');
          setError('Le paiement a échoué');
          clearInterval(pollInterval);
        }
        setPollingCount((c) => c + 1);
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [status, transactionRef]);

  async function initiatePayment() {
    // En mode test, pas besoin de numéro mobile
    if (!TEST_MODE && (!mobileNumber || mobileNumber.length < 9)) {
      setError('Numéro Mobile Money invalide');
      return;
    }

    setStatus('initiating');
    setError(null);

    try {
      const res = await api.post('/api/payments/initiate', {
        ticketTypeId: ticketType.id,
        eventId: event.id,
        quantity,
        mobileNumber: mobileNumber || '0000000000',
        currency,
      });

      // En mode test, le paiement est immédiatement complété
      if (TEST_MODE || res.data.payment.status === 'completed') {
        setStatus('completed');
        return;
      }

      setTransactionRef(res.data.payment.transactionRef);
      setStatus('processing');
      setPollingCount(0);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors du paiement');
      setStatus('failed');
    }
  }

  function handleSuccess() {
    Alert.alert(
      'Paiement réussi !',
      'Votre ticket a été créé avec succès.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  }

  if (!ticketType || !event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Données manquantes</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Retour</Text>
        </TouchableOpacity>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement Mobile Money</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status: Idle - Formulaire */}
        {status === 'idle' && (
          <>
            {/* Résumé */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ticket size={18} color={colors.primary.purple} />
                <Text style={styles.cardHeaderText}>Résumé de la commande</Text>
              </View>
              <Text style={styles.ticketName}>{ticketType.name}</Text>
              <Text style={styles.eventName}>{event.title}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Prix unitaire</Text>
                <Text style={styles.priceValue}>{ticketType.price} {currency}</Text>
              </View>
            </View>

            {/* Quantité */}
            <View style={styles.card}>
              <Text style={styles.label}>Quantité</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.min(10, quantity + 1))}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Devise */}
            <View style={styles.card}>
              <Text style={styles.label}>Devise</Text>
              <View style={styles.currencyRow}>
                <TouchableOpacity
                  style={[styles.currencyButton, currency === 'CDF' && styles.currencyButtonActive]}
                  onPress={() => setCurrency('CDF')}
                >
                  <Text style={[styles.currencyButtonText, currency === 'CDF' && styles.currencyButtonTextActive]}>
                    CDF
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.currencyButton, currency === 'USD' && styles.currencyButtonActive]}
                  onPress={() => setCurrency('USD')}
                >
                  <Text style={[styles.currencyButtonText, currency === 'USD' && styles.currencyButtonTextActive]}>
                    USD
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Numéro Mobile Money - Caché en mode test */}
            {!TEST_MODE && (
              <View style={styles.card}>
                <Text style={styles.label}>Numéro Mobile Money</Text>
                <View style={styles.inputContainer}>
                  <Smartphone size={20} color={colors.text.muted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 0810022154"
                    placeholderTextColor={colors.text.muted}
                    value={mobileNumber}
                    onChangeText={setMobileNumber}
                    keyboardType="phone-pad"
                  />
                </View>
                <Text style={styles.hint}>Orange, Airtel, M-Pesa, Vodacom...</Text>
              </View>
            )}

            {/* Badge mode test */}
            {TEST_MODE && (
              <View style={[styles.card, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', borderWidth: 1 }]}>
                <Text style={{ color: colors.status.success, fontWeight: '600', textAlign: 'center' }}>
                  🧪 MODE TEST - Paiement simulé
                </Text>
                <Text style={{ color: colors.text.muted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  Le ticket sera créé sans paiement réel
                </Text>
              </View>
            )}

            {/* Total */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total à payer</Text>
              <Text style={styles.totalValue}>{totalAmount} {currency}</Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Bouton Payer */}
            <TouchableOpacity style={styles.payButton} onPress={initiatePayment}>
              <LinearGradient
                colors={colors.gradients.primary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.payButtonGradient}
              >
                <CreditCard size={20} color={colors.text.primary} />
                <Text style={styles.payButtonText}>Payer {totalAmount} {currency}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* Status: Initiating */}
        {status === 'initiating' && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={colors.primary.purple} />
            <Text style={styles.statusTitle}>Initialisation du paiement...</Text>
            <Text style={styles.statusSubtitle}>Veuillez patienter</Text>
          </View>
        )}

        {/* Status: Processing */}
        {status === 'processing' && (
          <View style={styles.statusContainer}>
            <View style={styles.statusIcon}>
              <Clock size={48} color={colors.primary.purple} />
            </View>
            <Text style={styles.statusTitle}>En attente de confirmation</Text>
            <Text style={styles.statusSubtitle}>
              Veuillez confirmer le paiement sur votre téléphone
            </Text>
            <ActivityIndicator size="small" color={colors.text.muted} style={{ marginTop: 20 }} />
            <Text style={styles.pollingText}>Vérification en cours... ({pollingCount})</Text>
            <Text style={styles.refText}>Référence: {transactionRef}</Text>
          </View>
        )}

        {/* Status: Completed */}
        {status === 'completed' && (
          <View style={styles.statusContainer}>
            <View style={[styles.statusIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <CheckCircle size={48} color={colors.status.success} />
            </View>
            <Text style={styles.statusTitle}>Paiement réussi !</Text>
            <Text style={styles.statusSubtitle}>Votre ticket a été créé avec succès</Text>
            <TouchableOpacity style={styles.successButton} onPress={handleSuccess}>
              <Text style={styles.successButtonText}>Voir mes billets</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status: Failed */}
        {status === 'failed' && (
          <View style={styles.statusContainer}>
            <View style={[styles.statusIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <XCircle size={48} color={colors.status.error} />
            </View>
            <Text style={styles.statusTitle}>Paiement échoué</Text>
            <Text style={styles.statusSubtitle}>{error || 'Une erreur est survenue'}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setStatus('idle');
                setError(null);
              }}
            >
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    padding: 24,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardHeaderText: {
    fontSize: 12,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ticketName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  eventName: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.text.muted,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.cardHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 24,
    color: colors.text.primary,
  },
  quantityValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    minWidth: 40,
    textAlign: 'center',
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background.cardHover,
    alignItems: 'center',
  },
  currencyButtonActive: {
    backgroundColor: colors.primary.purple,
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.muted,
  },
  currencyButtonTextActive: {
    color: colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.cardHover,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  hint: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 8,
  },
  totalCard: {
    backgroundColor: colors.primary.purple + '20',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary.purple + '40',
  },
  totalLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary.purple,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.status.error,
    fontSize: 14,
    textAlign: 'center',
  },
  payButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 40,
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 56,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  button: {
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  statusIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary.purple + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  pollingText: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 8,
  },
  refText: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 16,
    fontFamily: 'monospace',
  },
  successButton: {
    backgroundColor: colors.status.success,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 32,
  },
  successButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 32,
  },
  retryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
