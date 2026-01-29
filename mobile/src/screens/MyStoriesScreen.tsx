import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, X, Plus, Trash2, Image as ImageIcon } from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

type Story = {
  id: number;
  user_id: number;
  image_url: string;
  caption: string | null;
  created_at: string;
};

export default function MyStoriesScreen() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadStories();
  }, []);

  async function loadStories() {
    try {
      setError(null);
      const res = await api.get('/api/stories/mine');
      setStories(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadStories();
  }

  async function pickImage() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission requise', 'Permission d\'accès à la galerie requise');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, // Désactivé car l'éditeur natif Android a des problèmes de visibilité des boutons
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setCreateModalVisible(true);
    }
  }

  // Fonction pour convertir toute image en JPEG et réduire la taille
  async function convertToJpeg(uri: string): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }], // Réduire à 1080px de large max
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch (error) {
      console.log('Erreur conversion image:', error);
      return uri; // Retourner l'URI original en cas d'erreur
    }
  }

  async function createStory() {
    if (!selectedImage) {
      Alert.alert('Erreur', 'Veuillez sélectionner une image');
      return;
    }

    setUploading(true);
    try {
      // Convertir l'image en JPEG pour éviter les problèmes HEIC
      const convertedUri = await convertToJpeg(selectedImage);
      
      // Upload image
      const formData = new FormData();
      const filename = 'story_' + Date.now() + '.jpg';
      const type = 'image/jpeg';

      formData.append('file', {
        uri: convertedUri,
        name: filename,
        type,
      } as any);

      const uploadRes = await api.post('/api/uploads/story', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // 60 secondes pour l'upload
      });

      const imageUrl = uploadRes.data?.url;
      if (!imageUrl) throw new Error('URL image manquante');

      // Create story
      await api.post('/api/stories', {
        imageUrl,
        caption: caption.trim() || null,
      });

      Alert.alert('Succès', 'Story créée !');
      setCreateModalVisible(false);
      setSelectedImage(null);
      setCaption('');
      loadStories();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur création story');
    } finally {
      setUploading(false);
    }
  }

  async function deleteStory(storyId: number) {
    Alert.alert(
      'Supprimer la story',
      'Êtes-vous sûr de vouloir supprimer cette story ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(storyId);
            try {
              await api.delete(`/api/stories/${storyId}`);
              Alert.alert('Succès', 'Story supprimée');
              loadStories();
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Erreur suppression');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Chargement des stories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadStories}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={colors.gradients.dark as [string, string]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.purple}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <LinearGradient
              colors={['rgba(236, 72, 153, 0.2)', 'rgba(239, 68, 68, 0.2)']}
              style={styles.headerIconGradient}
            >
              <ImageIcon size={24} color="#ec4899" />
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Mes Stories</Text>
            <Text style={styles.headerSubtitle}>{stories.length} story{stories.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity style={styles.createButton} onPress={pickImage}>
          <LinearGradient
            colors={colors.gradients.primary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButtonGradient}
          >
            <Plus size={20} color={colors.text.primary} />
            <Text style={styles.createButtonText}>Créer une story</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Stories List */}
        {stories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyTitle}>Aucune story</Text>
            <Text style={styles.emptyText}>Créez votre première story pour la partager</Text>
          </View>
        ) : (
          <View style={styles.storiesList}>
            {stories.map((story) => (
              <View key={story.id} style={styles.storyCard}>
                <Image source={{ uri: story.image_url }} style={styles.storyImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.storyOverlay}
                >
                  {story.caption && (
                    <Text style={styles.storyCaption}>{story.caption}</Text>
                  )}
                  <Text style={styles.storyDate}>
                    {new Date(story.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </LinearGradient>
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteStory(story.id)}
                  disabled={deletingId === story.id}
                >
                  {deletingId === story.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Trash2 size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Story Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !uploading && setCreateModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !uploading && setCreateModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Créer une story</Text>
              <TouchableOpacity
                onPress={() => !uploading && setCreateModalVisible(false)}
                disabled={uploading}
              >
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            )}

            <TextInput
              style={styles.captionInput}
              placeholder="Ajouter une légende (optionnel)..."
              placeholderTextColor={colors.text.muted}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={200}
              editable={!uploading}
            />

            <TouchableOpacity
              style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
              onPress={createStory}
              disabled={uploading}
            >
              <LinearGradient
                colors={uploading ? ['#6b7280', '#6b7280'] : (colors.gradients.primary as [string, string])}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                  <>
                    <Camera size={20} color={colors.text.primary} />
                    <Text style={styles.submitButtonText}>Publier</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background.dark,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.muted,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#fca5a5',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary.purple,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
  },
  storiesList: {
    gap: 16,
  },
  storyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 300,
    position: 'relative',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  storyCaption: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    lineHeight: 20,
  },
  storyDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
  },
  captionInput: {
    backgroundColor: colors.background.dark,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    minHeight: 80,
    maxHeight: 120,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  submitButton: {
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
    color: colors.text.primary,
  },
});
