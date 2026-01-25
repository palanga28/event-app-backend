import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  User,
  Phone,
  Building2,
  Globe,
  Camera,
  FileText,
  BadgeCheck,
  AlertTriangle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

interface VerificationStatus {
  isVerified: boolean;
  canSellTickets: boolean;
  verifiedAt: string | null;
  verification: {
    id: number;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
    reviewedAt: string | null;
  } | null;
}

export default function OrganizerVerificationScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<VerificationStatus | null>(null);

  // Formulaire
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<string>('individual');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Documents
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [idDocumentBackUrl, setIdDocumentBackUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/verification/status');
      setStatus(res.data);

      // Pré-remplir avec le nom de l'utilisateur
      if (user?.name && !fullName) {
        setFullName(user.name);
      }
    } catch (err) {
      console.error('Erreur chargement statut:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.name, fullName]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const pickImage = async (setUrl: (url: string) => void) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // TODO: Upload vers Supabase Storage et récupérer l'URL
        // Pour l'instant, on utilise l'URI locale
        setUrl(result.assets[0].uri);
        Alert.alert('Info', 'Document sélectionné. L\'upload sera effectué lors de la soumission.');
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Erreur', 'Le nom complet est requis');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Erreur', 'Le numéro de téléphone est requis');
      return;
    }

    if (!idDocumentUrl) {
      Alert.alert('Erreur', 'La pièce d\'identité (recto) est requise');
      return;
    }

    try {
      setSubmitting(true);

      await api.post('/api/verification/request', {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        businessName: businessName.trim() || null,
        businessType,
        idDocumentUrl,
        idDocumentBackUrl: idDocumentBackUrl || null,
        selfieUrl: selfieUrl || null,
        facebookUrl: facebookUrl.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
      });

      Alert.alert(
        'Demande envoyée',
        'Votre demande de vérification a été soumise. Vous serez notifié une fois qu\'elle sera traitée.',
        [{ text: 'OK', onPress: loadStatus }]
      );
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = () => {
    if (status?.isVerified) {
      return <CheckCircle size={48} color="#10B981" />;
    }
    if (status?.verification?.status === 'pending' || status?.verification?.status === 'under_review') {
      return <Clock size={48} color="#F59E0B" />;
    }
    if (status?.verification?.status === 'rejected') {
      return <XCircle size={48} color="#EF4444" />;
    }
    return <BadgeCheck size={48} color={colors.text.muted} />;
  };

  const getStatusText = () => {
    if (status?.isVerified) {
      return 'Organisateur vérifié';
    }
    if (status?.verification?.status === 'pending') {
      return 'Demande en attente';
    }
    if (status?.verification?.status === 'under_review') {
      return 'En cours d\'examen';
    }
    if (status?.verification?.status === 'rejected') {
      return 'Demande rejetée';
    }
    return 'Non vérifié';
  };

  const getStatusColor = () => {
    if (status?.isVerified) return '#10B981';
    if (status?.verification?.status === 'pending' || status?.verification?.status === 'under_review') return '#F59E0B';
    if (status?.verification?.status === 'rejected') return '#EF4444';
    return colors.text.muted;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={colors.gradients.dark as [string, string]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.primary.purple} />
      </View>
    );
  }

  // Si déjà vérifié
  if (status?.isVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={colors.gradients.dark as [string, string]} style={StyleSheet.absoluteFill} />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vérification organisateur</Text>
        </View>

        <View style={styles.verifiedContainer}>
          <View style={styles.verifiedBadge}>
            <CheckCircle size={64} color="#10B981" />
          </View>
          <Text style={styles.verifiedTitle}>Félicitations !</Text>
          <Text style={styles.verifiedSubtitle}>Vous êtes un organisateur vérifié</Text>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.benefitText}>Badge ✔ visible sur vos événements</Text>
            </View>
            <View style={styles.benefitItem}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.benefitText}>Vente de billets activée</Text>
            </View>
            <View style={styles.benefitItem}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.benefitText}>Confiance accrue des acheteurs</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Si demande en cours
  if (status?.verification?.status === 'pending' || status?.verification?.status === 'under_review') {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={colors.gradients.dark as [string, string]} style={StyleSheet.absoluteFill} />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vérification organisateur</Text>
        </View>

        <View style={styles.pendingContainer}>
          <View style={styles.pendingIcon}>
            <Clock size={64} color="#F59E0B" />
          </View>
          <Text style={styles.pendingTitle}>Demande en cours</Text>
          <Text style={styles.pendingSubtitle}>
            Votre demande de vérification est en cours de traitement. Vous serez notifié une fois qu'elle sera examinée.
          </Text>
          <Text style={styles.pendingDate}>
            Soumise le {new Date(status.verification.createdAt).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Formulaire de demande
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors.gradients.dark as [string, string]} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Devenir organisateur vérifié</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Message si rejeté */}
          {status?.verification?.status === 'rejected' && (
            <View style={styles.rejectedBanner}>
              <AlertTriangle size={20} color="#EF4444" />
              <View style={styles.rejectedContent}>
                <Text style={styles.rejectedTitle}>Demande précédente rejetée</Text>
                <Text style={styles.rejectedReason}>
                  {status.verification.rejectionReason || 'Aucun motif spécifié'}
                </Text>
              </View>
            </View>
          )}

          {/* Avantages */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pourquoi devenir vérifié ?</Text>
            <View style={styles.advantageItem}>
              <BadgeCheck size={20} color={colors.primary.purple} />
              <Text style={styles.advantageText}>Badge ✔ sur votre profil et événements</Text>
            </View>
            <View style={styles.advantageItem}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.advantageText}>Vente de billets payants activée</Text>
            </View>
            <View style={styles.advantageItem}>
              <User size={20} color="#3B82F6" />
              <Text style={styles.advantageText}>Confiance accrue des acheteurs</Text>
            </View>
          </View>

          {/* Informations personnelles */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informations personnelles</Text>
            
            <Text style={styles.label}>Nom complet *</Text>
            <View style={styles.inputContainer}>
              <User size={20} color={colors.text.muted} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Votre nom complet"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.label}>Numéro de téléphone *</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color={colors.text.muted} />
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+243 XXX XXX XXX"
                placeholderTextColor={colors.text.muted}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.label}>Type d'organisateur</Text>
            <View style={styles.typeButtons}>
              {[
                { value: 'individual', label: 'Individuel' },
                { value: 'company', label: 'Entreprise' },
                { value: 'association', label: 'Association' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    businessType === type.value && styles.typeButtonActive,
                  ]}
                  onPress={() => setBusinessType(type.value)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      businessType === type.value && styles.typeButtonTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {businessType !== 'individual' && (
              <>
                <Text style={styles.label}>Nom de l'entreprise/association</Text>
                <View style={styles.inputContainer}>
                  <Building2 size={20} color={colors.text.muted} />
                  <TextInput
                    style={styles.input}
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="Nom de votre structure"
                    placeholderTextColor={colors.text.muted}
                  />
                </View>
              </>
            )}
          </View>

          {/* Documents */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Documents de vérification</Text>
            
            <Text style={styles.label}>Pièce d'identité (recto) *</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickImage(setIdDocumentUrl)}
            >
              {idDocumentUrl ? (
                <Image source={{ uri: idDocumentUrl }} style={styles.uploadedImage} />
              ) : (
                <>
                  <FileText size={24} color={colors.text.muted} />
                  <Text style={styles.uploadText}>Ajouter le recto</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Pièce d'identité (verso)</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickImage(setIdDocumentBackUrl)}
            >
              {idDocumentBackUrl ? (
                <Image source={{ uri: idDocumentBackUrl }} style={styles.uploadedImage} />
              ) : (
                <>
                  <FileText size={24} color={colors.text.muted} />
                  <Text style={styles.uploadText}>Ajouter le verso</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Selfie avec pièce d'identité</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickImage(setSelfieUrl)}
            >
              {selfieUrl ? (
                <Image source={{ uri: selfieUrl }} style={styles.uploadedImage} />
              ) : (
                <>
                  <Camera size={24} color={colors.text.muted} />
                  <Text style={styles.uploadText}>Prendre un selfie</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Réseaux sociaux */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Présence en ligne (optionnel)</Text>
            
            <Text style={styles.label}>Page Facebook</Text>
            <View style={styles.inputContainer}>
              <Globe size={20} color={colors.text.muted} />
              <TextInput
                style={styles.input}
                value={facebookUrl}
                onChangeText={setFacebookUrl}
                placeholder="https://facebook.com/..."
                placeholderTextColor={colors.text.muted}
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>Compte Instagram</Text>
            <View style={styles.inputContainer}>
              <Globe size={20} color={colors.text.muted} />
              <TextInput
                style={styles.input}
                value={instagramUrl}
                onChangeText={setInstagramUrl}
                placeholder="https://instagram.com/..."
                placeholderTextColor={colors.text.muted}
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>Site web</Text>
            <View style={styles.inputContainer}>
              <Globe size={20} color={colors.text.muted} />
              <TextInput
                style={styles.input}
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                placeholder="https://..."
                placeholderTextColor={colors.text.muted}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Bouton soumettre */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <LinearGradient
              colors={colors.gradients.primary as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButtonGradient}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <BadgeCheck size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Soumettre ma demande</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
  },
  
  // Verified state
  verifiedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  verifiedBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  verifiedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  verifiedSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 32,
  },
  benefitsList: {
    width: '100%',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: colors.text.primary,
  },

  // Pending state
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pendingIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  pendingSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  pendingDate: {
    fontSize: 12,
    color: colors.text.muted,
  },

  // Rejected banner
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  rejectedContent: {
    flex: 1,
  },
  rejectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 4,
  },
  rejectedReason: {
    fontSize: 13,
    color: colors.text.secondary,
  },

  // Card
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },

  // Advantages
  advantageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  advantageText: {
    fontSize: 14,
    color: colors.text.secondary,
  },

  // Form
  label: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background.elevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },

  // Type buttons
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: colors.primary.purple,
  },
  typeButtonText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Upload
  uploadButton: {
    height: 120,
    backgroundColor: colors.background.elevated,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.background.card,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  uploadText: {
    fontSize: 13,
    color: colors.text.muted,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Submit button
  submitButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
