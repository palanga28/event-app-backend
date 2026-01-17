import React, { useState, useEffect } from 'react';
import logger from '../lib/logger';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Ticket, Heart, Calendar, Settings, LogOut, Plus, Bell, Camera, Save, X, Edit, Image as ImageIcon } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';
import { api } from '../lib/api';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, isAuthenticated, refreshUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [creatingStory, setCreatingStory] = useState(false);
  const [eventsCount, setEventsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    setBio(user?.bio || '');
  }, [user?.bio]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (refreshUser) {
        refreshUser();
      }
    }, [refreshUser])
  );

  async function loadStats() {
    if (!user) return;
    
    try {
      const [eventsRes, followStatsRes] = await Promise.all([
        api.get('/api/events/mine'),
        api.get(`/api/users/${user.id}/follow-stats`)
      ]);
      
      setEventsCount(Array.isArray(eventsRes.data) ? eventsRes.data.length : 0);
      setFollowersCount(followStatsRes.data.followers || 0);
      setFollowingCount(followStatsRes.data.following || 0);
    } catch (err) {
      logger.error('Load stats error:', err);
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleSaveBio() {
    setSaving(true);
    try {
      await api.put('/api/users/profile', { bio });
      Alert.alert('Succès', 'Profil mis à jour');
      setIsEditing(false);
      if (refreshUser) await refreshUser();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur mise à jour profil');
    } finally {
      setSaving(false);
    }
  }

  async function handlePickAvatar() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission requise', 'Permission d\'accès à la galerie requise');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  }

  async function uploadAvatar(uri: string) {
    setUploadingAvatar(true);
    setShowAvatarModal(false);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri,
        name: filename,
        type,
      } as any);

      const uploadRes = await api.post('/api/uploads/profile-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const avatarUrl = uploadRes.data?.url;
      if (!avatarUrl) throw new Error('URL avatar manquante');

      await api.put('/api/users/profile', { avatarUrl });
      Alert.alert('Succès', 'Avatar mis à jour');
      if (refreshUser) await refreshUser();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleCreateStory() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission requise', 'Permission d\'accès à la galerie requise');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });

    if (!result.canceled && result.assets[0]) {
      setShowAvatarModal(false);
      await createStory(result.assets[0].uri);
    }
  }

  async function createStory(uri: string) {
    setCreatingStory(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'story.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri,
        name: filename,
        type,
      } as any);

      const uploadRes = await api.post('/api/uploads/story', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrl = uploadRes.data?.url;
      if (!imageUrl) throw new Error('URL image manquante');

      await api.post('/api/stories', {
        imageUrl,
        caption: null,
      });

      Alert.alert('Succès', 'Story créée !');
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur création story');
    } finally {
      setCreatingStory(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={colors.gradients.dark as [string, string]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.notLoggedIn}>
          <User size={64} color={colors.text.muted} />
          <Text style={styles.notLoggedInTitle}>Non connecté</Text>
          <Text style={styles.notLoggedInText}>
            Connecte-toi pour accéder à ton profil
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

  const menuItems = [
    {
      icon: Plus,
      label: 'Créer un événement',
      onPress: () => navigation.navigate('CreateEvent'),
      color: colors.primary.violet,
    },
    {
      icon: Ticket,
      label: 'Mes billets',
      onPress: () => navigation.navigate('MyTickets'),
      color: colors.primary.purple,
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradients.dark as [string, string]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={() => setShowAvatarModal(true)} disabled={uploadingAvatar || creatingStory}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={40} color={colors.text.muted} />
                </View>
              )}
              <View style={styles.cameraButton}>
                {uploadingAvatar || creatingStory ? (
                  <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                  <Camera size={16} color={colors.text.primary} />
                )}
              </View>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{loadingStats ? '-' : eventsCount}</Text>
              <Text style={styles.statLabel}>Événements</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{loadingStats ? '-' : followersCount}</Text>
              <Text style={styles.statLabel}>Abonnés</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{loadingStats ? '-' : followingCount}</Text>
              <Text style={styles.statLabel}>Abonnements</Text>
            </TouchableOpacity>
          </View>
          
          {/* Bio Section */}
          <View style={styles.bioSection}>
            {isEditing ? (
              <View style={styles.bioEditContainer}>
                <TextInput
                  style={styles.bioInput}
                  placeholder="Écris quelque chose sur toi..."
                  placeholderTextColor={colors.text.muted}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                />
                <View style={styles.bioActions}>
                  <TouchableOpacity
                    style={styles.bioActionButton}
                    onPress={() => {
                      setBio(user?.bio || '');
                      setIsEditing(false);
                    }}
                    disabled={saving}
                  >
                    <X size={18} color={colors.text.muted} />
                    <Text style={styles.bioActionText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bioActionButton, styles.bioSaveButton]}
                    onPress={handleSaveBio}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.primary.purple} />
                    ) : (
                      <>
                        <Save size={18} color={colors.primary.purple} />
                        <Text style={[styles.bioActionText, { color: colors.primary.purple }]}>Sauvegarder</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.bioDisplayContainer}>
                {user?.bio ? (
                  <Text style={styles.userBio}>{user.bio}</Text>
                ) : (
                  <Text style={styles.noBio}>Aucune bio</Text>
                )}
                <TouchableOpacity
                  style={styles.editBioButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Edit size={16} color={colors.primary.purple} />
                  <Text style={styles.editBioText}>Modifier</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Menu Items - Grid Layout */}
        <View style={styles.menuContainer}>
          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuCard}
                onPress={item.onPress}
              >
                <View style={[styles.menuCardIconContainer, { backgroundColor: `${item.color}20` }]} >
                  <item.icon size={28} color={item.color} />
                </View>
                <Text style={styles.menuCardLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <LogOut size={20} color={colors.status.error} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Avatar Options Modal */}
      <Modal
        visible={showAvatarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAvatarModal(false)}>
          <Pressable style={styles.avatarModalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.avatarModalTitle}>Photo de profil</Text>
            
            <TouchableOpacity
              style={styles.avatarModalOption}
              onPress={handlePickAvatar}
            >
              <View style={styles.avatarModalIconContainer}>
                <ImageIcon size={24} color={colors.primary.purple} />
              </View>
              <View style={styles.avatarModalTextContainer}>
                <Text style={styles.avatarModalOptionTitle}>
                  {user?.avatar_url ? 'Modifier la photo' : 'Ajouter une photo'}
                </Text>
                <Text style={styles.avatarModalOptionSubtitle}>
                  {user?.avatar_url ? 'Changer votre photo de profil' : 'Ajouter une photo de profil'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarModalOption}
              onPress={handleCreateStory}
            >
              <View style={styles.avatarModalIconContainer}>
                <Plus size={24} color={colors.primary.pink} />
              </View>
              <View style={styles.avatarModalTextContainer}>
                <Text style={styles.avatarModalOptionTitle}>Ajouter une story</Text>
                <Text style={styles.avatarModalOptionSubtitle}>Partager un moment</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarModalCancel}
              onPress={() => setShowAvatarModal(false)}
            >
              <Text style={styles.avatarModalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
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
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.light,
  },
  userBio: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.purple,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.dark,
  },
  bioSection: {
    width: '100%',
    marginTop: 16,
  },
  bioDisplayContainer: {
    alignItems: 'center',
  },
  noBio: {
    fontSize: 14,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  editBioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: `${colors.primary.purple}20`,
    borderRadius: 8,
    marginTop: 8,
  },
  editBioText: {
    fontSize: 14,
    color: colors.primary.purple,
    fontWeight: '500',
  },
  bioEditContainer: {
    width: '100%',
  },
  bioInput: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    minHeight: 100,
    maxHeight: 150,
  },
  bioActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    justifyContent: 'center',
  },
  bioActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 10,
  },
  bioSaveButton: {
    backgroundColor: `${colors.primary.purple}20`,
    borderColor: colors.primary.purple,
  },
  bioActionText: {
    fontSize: 14,
    color: colors.text.muted,
    fontWeight: '500',
  },
  menuContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  menuGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  menuCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  menuCardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuCardLabel: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    marginBottom: 100,
    padding: 16,
  },
  logoutText: {
    fontSize: 16,
    color: colors.status.error,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  avatarModalContent: {
    backgroundColor: colors.background.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border.light,
  },
  avatarModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  avatarModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.dark,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  avatarModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarModalTextContainer: {
    flex: 1,
  },
  avatarModalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  avatarModalOptionSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
  },
  avatarModalCancel: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  avatarModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.muted,
  },
});
