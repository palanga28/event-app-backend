import React, { useState } from 'react';
import logger from '../lib/logger';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// @ts-ignore - expo-image-picker sera installé
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ArrowLeft, Calendar, MapPin, FileText, Image as ImageIcon, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

export default function CreateEventScreen() {
  const navigation = useNavigation<any>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de la permission pour accéder à vos photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.5, // Réduit de 0.8 à 0.5 pour des images plus légères
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets) {
      // Convertir toutes les images en JPEG pour éviter les problèmes HEIC
      const convertedPhotos = await Promise.all(
        result.assets.map(async (asset: any) => {
          try {
            // Convertir en JPEG avec compression
            const manipResult = await ImageManipulator.manipulateAsync(
              asset.uri,
              [], // Pas de transformations, juste conversion
              { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );
            return manipResult.uri;
          } catch (error) {
            logger.error('Erreur conversion image:', error);
            return asset.uri; // Fallback sur l'URI originale
          }
        })
      );
      setPhotos([...photos, ...convertedPhotos].slice(0, 10));
    }
  }

  function removePhoto(index: number) {
    setPhotos(photos.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    // Validation
    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }

    if (title.trim().length < 3) {
      setError('Le titre doit contenir au moins 3 caractères');
      return;
    }

    if (!startDate || !endDate) {
      setError('Les dates de début et de fin sont requises');
      return;
    }

    if (photos.length < 2) {
      setError('Au moins 2 photos sont requises');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload des images (toutes en une seule requête)
      const formData = new FormData();
      
      for (const photoUri of photos) {
        const filename = photoUri.split('/').pop() || 'photo.jpg';
        // Forcer le nom de fichier en .jpg et le type MIME en image/jpeg
        const jpegFilename = filename.replace(/\.(heic|heif|png|webp|gif)$/i, '.jpg');
        
        formData.append('files', {
          uri: photoUri,
          name: jpegFilename,
          type: 'image/jpeg', // Toujours JPEG car converti par ImageManipulator
        } as any);
      }

      const uploadRes = await api.post('/api/uploads/event-images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadedUrls = uploadRes.data.urls || [];

      if (uploadedUrls.length < 2) {
        setError('Erreur lors de l\'upload des photos');
        setLoading(false);
        return;
      }

      // Parser les dates (format: YYYY-MM-DD HH:MM)
      const parseDateTime = (dateStr: string): Date => {
        // Essayer de parser le format "YYYY-MM-DD HH:MM"
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
        if (match) {
          const [, year, month, day, hour, minute] = match;
          return new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1, // Les mois commencent à 0
            parseInt(day, 10),
            parseInt(hour, 10),
            parseInt(minute, 10)
          );
        }
        // Fallback sur le parsing standard
        return new Date(dateStr);
      };

      const parsedStartDate = parseDateTime(startDate);
      const parsedEndDate = parseDateTime(endDate);

      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        setError('Format de date invalide. Utilisez: YYYY-MM-DD HH:MM (ex: 2026-01-20 14:00)');
        setLoading(false);
        return;
      }

      // Créer l'événement
      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        startDate: parsedStartDate.toISOString(),
        endDate: parsedEndDate.toISOString(),
        capacity: capacity.trim() ? parseInt(capacity, 10) : null,
        images: uploadedUrls,
        coverImage: uploadedUrls[0],
      };

      const response = await api.post('/api/events', eventData);

      if (response.data.event) {
        Alert.alert(
          'Succès',
          'Événement créé avec succès !',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('EventDetail', { eventId: response.data.event.id }),
            },
          ]
        );
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de la création');
      logger.error('Create event error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={colors.gradients.dark as [string, string]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer un événement</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Titre *</Text>
          <View style={styles.inputContainer}>
            <FileText size={20} color={colors.text.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nom de l'événement"
              placeholderTextColor={colors.text.muted}
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décris ton événement..."
            placeholderTextColor={colors.text.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>Lieu</Text>
          <View style={styles.inputContainer}>
            <MapPin size={20} color={colors.text.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Adresse de l'événement"
              placeholderTextColor={colors.text.muted}
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.label}>Dates *</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Début</Text>
              <View style={styles.inputContainer}>
                <Calendar size={16} color={colors.text.muted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.dateField]}
                  placeholder="YYYY-MM-DD HH:MM"
                  placeholderTextColor={colors.text.muted}
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
            </View>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Fin</Text>
              <View style={styles.inputContainer}>
                <Calendar size={16} color={colors.text.muted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.dateField]}
                  placeholder="YYYY-MM-DD HH:MM"
                  placeholderTextColor={colors.text.muted}
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            </View>
          </View>
          <Text style={styles.hint}>Format: 2026-01-15 14:00</Text>
        </View>

        {/* Capacity */}
        <View style={styles.section}>
          <Text style={styles.label}>Nombre de places (optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 500"
            placeholderTextColor={colors.text.muted}
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="numeric"
          />
          <Text style={styles.hint}>
            La somme des billets créés ne pourra pas dépasser ce nombre
          </Text>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.label}>Photos * (min. 2)</Text>
          <TouchableOpacity style={styles.addPhotoButton} onPress={pickImages}>
            <ImageIcon size={24} color={colors.primary.purple} />
            <Text style={styles.addPhotoText}>Ajouter des photos</Text>
          </TouchableOpacity>

          {photos.length > 0 && (
            <View style={styles.photoGrid}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <X size={16} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={colors.gradients.primary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.primary} />
            ) : (
              <Text style={styles.submitButtonText}>Créer l'événement</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 6,
  },
  dateField: {
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 6,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 2,
    borderColor: colors.primary.purple,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
  },
  addPhotoText: {
    color: colors.primary.purple,
    fontSize: 16,
    fontWeight: '600',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  photoItem: {
    width: '31%',
    aspectRatio: 1,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: colors.background.card,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
