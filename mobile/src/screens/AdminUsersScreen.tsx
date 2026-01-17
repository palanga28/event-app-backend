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
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Shield, Ban, Trash2, Search, Filter, X } from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';

type User = {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  banned?: boolean;
  banned_reason?: string | null;
  created_at: string;
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  async function loadUsers() {
    try {
      setError(null);
      const res = await api.get<User[]>('/api/admin/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function filterUsers() {
    let filtered = users;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }

  function onRefresh() {
    setRefreshing(true);
    loadUsers();
  }

  async function changeRole(userId: number, newRole: string) {
    setActionLoading(userId);
    try {
      await api.put(`/api/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as User['role'] } : u));
      Alert.alert('Succès', `Rôle mis à jour: ${newRole}`);
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur modification rôle');
    } finally {
      setActionLoading(null);
    }
  }

  async function banUser(userId: number, userName: string) {
    Alert.prompt(
      'Bannir l\'utilisateur',
      `Raison du bannissement de "${userName}" (optionnel):`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bannir',
          style: 'destructive',
          onPress: async (reason?: string) => {
            setActionLoading(userId);
            try {
              await api.put(`/api/admin/users/${userId}/ban`, { reason: reason || undefined });
              setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: true, banned_reason: reason || 'Banni par un administrateur' } : u));
              Alert.alert('Succès', `${userName} a été banni`);
              loadUsers();
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Erreur bannissement');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
      'plain-text'
    );
  }

  async function unbanUser(userId: number, userName: string) {
    Alert.alert(
      'Débannir l\'utilisateur',
      `Êtes-vous sûr de vouloir débannir "${userName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Débannir',
          onPress: async () => {
            setActionLoading(userId);
            try {
              await api.put(`/api/admin/users/${userId}/unban`);
              setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: false, banned_reason: null } : u));
              Alert.alert('Succès', `${userName} a été débanni`);
              loadUsers();
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Erreur débannissement');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }

  async function deleteUser(userId: number, userName: string) {
    Alert.alert(
      'Supprimer l\'utilisateur',
      `Êtes-vous sûr de vouloir supprimer "${userName}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(userId);
            try {
              await api.delete(`/api/admin/users/${userId}`);
              setUsers(prev => prev.filter(u => u.id !== userId));
              Alert.alert('Succès', 'Utilisateur supprimé');
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Erreur suppression');
            } finally {
              setActionLoading(null);
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
        <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const roleColors: Record<string, string> = {
    admin: '#ef4444',
    moderator: '#f59e0b',
    user: '#6b7280',
  };

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
              colors={['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.2)']}
              style={styles.headerIconGradient}
            >
              <Users size={24} color="#ef4444" />
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Utilisateurs</Text>
            <Text style={styles.headerSubtitle}>{filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Search & Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={18} color={colors.text.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par nom ou email..."
              placeholderTextColor={colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Role Filter */}
        <View style={styles.filterContainer}>
          {['all', 'user', 'moderator', 'admin'].map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.filterTab, roleFilter === role && styles.filterTabActive]}
              onPress={() => setRoleFilter(role)}
            >
              <Text style={[styles.filterTabText, roleFilter === role && styles.filterTabTextActive]}>
                {role === 'all' ? 'Tous' : role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Users List */}
        <View style={styles.usersList}>
          {filteredUsers.map((user) => (
            <View key={user.id} style={[styles.userCard, user.banned && styles.userCardBanned]}>
              <View style={styles.userHeader}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userMeta}>
                    <View style={[styles.roleBadge, { backgroundColor: `${roleColors[user.role]}20` }]}>
                      <Text style={[styles.roleBadgeText, { color: roleColors[user.role] }]}>
                        {user.role}
                      </Text>
                    </View>
                    {user.banned && (
                      <View style={styles.bannedBadge}>
                        <Ban size={12} color="#ef4444" />
                        <Text style={styles.bannedText}>Banni</Text>
                      </View>
                    )}
                  </View>
                  {user.banned && user.banned_reason && (
                    <Text style={styles.banReason}>Raison: {user.banned_reason}</Text>
                  )}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setSelectedUser(user);
                    setShowRoleModal(true);
                  }}
                  disabled={actionLoading === user.id}
                >
                  <Shield size={16} color={colors.primary.purple} />
                  <Text style={styles.actionButtonText}>Rôle</Text>
                </TouchableOpacity>

                {user.banned ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonSuccess]}
                    onPress={() => unbanUser(user.id, user.name)}
                    disabled={actionLoading === user.id}
                  >
                    <Shield size={16} color="#10b981" />
                    <Text style={[styles.actionButtonText, { color: '#10b981' }]}>Débannir</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonWarning]}
                    onPress={() => banUser(user.id, user.name)}
                    disabled={actionLoading === user.id}
                  >
                    <Ban size={16} color="#f59e0b" />
                    <Text style={[styles.actionButtonText, { color: '#f59e0b' }]}>Bannir</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  onPress={() => deleteUser(user.id, user.name)}
                  disabled={actionLoading === user.id}
                >
                  <Trash2 size={16} color="#ef4444" />
                  <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Supprimer</Text>
                </TouchableOpacity>
              </View>

              {actionLoading === user.id && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={colors.primary.purple} />
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Role Change Modal */}
      <Modal
        visible={showRoleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRoleModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Changer le rôle</Text>
            <Text style={styles.modalSubtitle}>{selectedUser?.name}</Text>

            <View style={styles.roleOptions}>
              {['user', 'moderator', 'admin'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    selectedUser?.role === role && styles.roleOptionActive,
                  ]}
                  onPress={() => selectedUser && changeRole(selectedUser.id, role)}
                  disabled={actionLoading !== null}
                >
                  <Text style={[
                    styles.roleOptionText,
                    selectedUser?.role === role && styles.roleOptionTextActive,
                  ]}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowRoleModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Annuler</Text>
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
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary.purple,
    borderColor: colors.primary.purple,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.muted,
  },
  filterTabTextActive: {
    color: colors.text.primary,
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  userCardBanned: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  userHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 6,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
  },
  bannedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
  },
  banReason: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    fontStyle: 'italic',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 8,
  },
  actionButtonSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionButtonWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  actionButtonDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.purple,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: 24,
    textAlign: 'center',
  },
  roleOptions: {
    gap: 12,
    marginBottom: 24,
  },
  roleOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.background.dark,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 10,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: colors.primary.purple,
    borderColor: colors.primary.purple,
  },
  roleOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.muted,
  },
  roleOptionTextActive: {
    color: colors.text.primary,
  },
  modalCloseButton: {
    paddingVertical: 12,
    backgroundColor: colors.background.dark,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
