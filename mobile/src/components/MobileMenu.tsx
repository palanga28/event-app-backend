import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {
  User,
  Calendar,
  Ticket,
  Heart,
  Bell,
  Search,
  Plus,
  LogOut,
  X,
  ChevronRight,
  Shield,
  BarChart3,
  Settings,
  Wallet,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

type MobileMenuProps = {
  visible: boolean;
  onClose: () => void;
};

export function MobileMenu({ visible, onClose }: MobileMenuProps) {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleNavigate = (screen: string) => {
    onClose();
    // Pour les tabs, on navigue vers Main puis vers le tab spécifique
    if (screen === 'ProfileTab' || screen === 'TicketsTab' || screen === 'HomeTab') {
      navigation.navigate('Main', { screen });
    } else {
      navigation.navigate(screen);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onClose();
      navigation.navigate('SearchEvents', { query: searchQuery });
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
    navigation.navigate('Login');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.menuContainer} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.1)', 'rgba(236, 72, 153, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>Menu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Search Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recherche</Text>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher des événements..."
                  placeholderTextColor={colors.text.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                />
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                  <Search size={18} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Navigation */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Navigation</Text>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('HomeTab')}
              >
                <Calendar size={20} color="#a78bfa" />
                <Text style={styles.menuItemText}>Événements</Text>
                <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('SearchEvents')}
              >
                <Search size={20} color="#60a5fa" />
                <Text style={styles.menuItemText}>Rechercher</Text>
                <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
              </TouchableOpacity>
            </View>

            {/* My Space */}
            {user && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mon espace</Text>
                
                <TouchableOpacity
                  style={styles.createEventButton}
                  onPress={() => handleNavigate('CreateEvent')}
                >
                  <LinearGradient
                    colors={['rgba(147, 51, 234, 0.3)', 'rgba(236, 72, 153, 0.3)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.createEventGradient}
                  >
                    <Plus size={20} color={colors.text.primary} />
                    <Text style={styles.createEventText}>Créer un événement</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('UserDashboard')}
                >
                  <User size={20} color="#a78bfa" />
                  <Text style={styles.menuItemText}>Mon tableau de bord</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('ProfileTab')}
                >
                  <User size={20} color="#a78bfa" />
                  <Text style={styles.menuItemText}>Mon profil</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('MyEvents')}
                >
                  <Calendar size={20} color="#a78bfa" />
                  <Text style={styles.menuItemText}>Mes événements</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('OrganizerEarnings')}
                >
                  <Wallet size={20} color="#10b981" />
                  <Text style={styles.menuItemText}>Mes gains</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('TicketsTab')}
                >
                  <Ticket size={20} color="#34d399" />
                  <Text style={styles.menuItemText}>Mes tickets</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('MyFavorites')}
                >
                  <Heart size={20} color="#ec4899" />
                  <Text style={styles.menuItemText}>Mes favoris</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('MyChallenges')}
                >
                  <Shield size={20} color="#fbbf24" />
                  <Text style={styles.menuItemText}>Mes défis</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Notifications')}
                >
                  <Bell size={20} color="#fbbf24" />
                  <Text style={styles.menuItemText}>Notifications</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Settings')}
                >
                  <Settings size={20} color="#6b7280" />
                  <Text style={styles.menuItemText}>Paramètres</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>
              </View>
            )}

            {/* Moderator Section */}
            {user && (user.role === 'moderator' || user.role === 'admin') && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Modération</Text>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('ModeratorDashboard')}
                >
                  <Shield size={20} color="#fbbf24" />
                  <Text style={styles.menuItemText}>Dashboard modérateur</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>
              </View>
            )}

            {/* Admin Section */}
            {user && user.role === 'admin' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Administration</Text>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('AdminStats')}
                >
                  <BarChart3 size={20} color="#ef4444" />
                  <Text style={styles.menuItemText}>Statistiques</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('AdminUsers')}
                >
                  <User size={20} color="#3b82f6" />
                  <Text style={styles.menuItemText}>Utilisateurs</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('AdminEvents')}
                >
                  <Calendar size={20} color="#a855f7" />
                  <Text style={styles.menuItemText}>Événements</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>
              </View>
            )}

            {/* Logout */}
            {user && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.menuItem, styles.logoutItem]}
                  onPress={handleLogout}
                >
                  <LogOut size={20} color="#ef4444" />
                  <Text style={[styles.menuItemText, styles.logoutText]}>Déconnexion</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Login/Register */}
            {!user && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Login')}
                >
                  <User size={20} color={colors.primary.purple} />
                  <Text style={styles.menuItemText}>Se connecter</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Register')}
                >
                  <User size={20} color={colors.primary.purple} />
                  <Text style={styles.menuItemText}>S'inscrire</Text>
                  <ChevronRight size={16} color={colors.text.muted} style={styles.chevron} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: colors.background.dark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 24,
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 8,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  chevron: {
    marginLeft: 'auto',
  },
  logoutItem: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#ef4444',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 14,
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary.purple,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createEventButton: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createEventGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    borderRadius: 12,
  },
  createEventText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
});
