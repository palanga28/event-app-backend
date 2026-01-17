import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';

export default function QRScannerScreen() {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || validating) return;

    setScanned(true);
    setValidating(true);
    Vibration.vibrate(100);

    try {
      const response = await api.post('/api/validation/validate', {
        qrCode: data,
      });

      const result = response.data;

      if (result.valid) {
        // Succès
        Vibration.vibrate([0, 200, 100, 200]);
        
        Alert.alert(
          '✅ Ticket Validé',
          `Ticket validé avec succès !\n\n` +
          `Propriétaire: ${result.ticket.owner.name}\n` +
          `Événement: ${result.ticket.event.title}\n` +
          `Type: ${result.ticket.ticketType.name}\n` +
          `Quantité: ${result.ticket.quantity}`,
          [
            {
              text: 'Scanner un autre',
              onPress: () => {
                setScanned(false);
                setValidating(false);
              },
            },
            {
              text: 'Terminer',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Échec
        Vibration.vibrate([0, 500]);
        
        Alert.alert(
          '❌ Ticket Invalide',
          result.message || 'Ce ticket ne peut pas être validé',
          [
            {
              text: 'Réessayer',
              onPress: () => {
                setScanned(false);
                setValidating(false);
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Vibration.vibrate([0, 500]);
      
      const errorMessage = error.response?.data?.message || error.message || 'Erreur de validation';
      
      Alert.alert(
        '❌ Erreur',
        errorMessage,
        [
          {
            text: 'Réessayer',
            onPress: () => {
              setScanned(false);
              setValidating(false);
            },
          },
        ]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Demande d'autorisation caméra...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-off" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Accès à la caméra refusé</Text>
        <Text style={styles.errorSubtext}>
          Veuillez autoriser l'accès à la caméra dans les paramètres
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scanner un ticket</Text>
      </View>

      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      <View style={styles.instructions}>
        <Ionicons name="qr-code-outline" size={48} color="#fff" />
        <Text style={styles.instructionsText}>
          {validating
            ? 'Validation en cours...'
            : scanned
            ? 'Ticket scanné'
            : 'Placez le QR code dans le cadre'}
        </Text>
        {validating && <ActivityIndicator size="large" color="#fff" style={styles.loader} />}
      </View>

      {scanned && !validating && (
        <TouchableOpacity
          style={styles.rescanButton}
          onPress={() => setScanned(false)}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
          <Text style={styles.rescanButtonText}>Scanner à nouveau</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#6366f1',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructions: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  loader: {
    marginTop: 16,
  },
  rescanButton: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
