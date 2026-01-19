import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, Linking, Platform } from 'react-native';
import { Home, Search, Ticket, User, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { AmpiaLogo } from '../components/AmpiaLogo';
import { MobileMenu } from '../components/MobileMenu';
import { useAuth } from '../contexts/AuthContext';

// Configuration du deep linking
const linking: LinkingOptions<any> = {
  prefixes: [
    'ampia-events://',
    'https://eventapp.com',
    'https://ampia-events.com',
  ],
  config: {
    screens: {
      Main: {
        screens: {
          HomeTab: 'home',
          SearchTab: 'search',
          TicketsTab: 'tickets',
          ProfileTab: 'profile',
        },
      },
      EventDetail: 'event/:eventId',
      UserProfile: 'user/:userId',
      Payment: 'payment',
      Login: 'login',
      Register: 'register',
    },
  },
};

// Screens
import HomeScreen from '../screens/HomeScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyTicketsScreen from '../screens/MyTicketsScreen';
import PaymentScreen from '../screens/PaymentScreen';
import MyFavoritesScreen from '../screens/MyFavoritesScreen';
import MyEventsScreen from '../screens/MyEventsScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import SearchEventsScreen from '../screens/SearchEventsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AdminStatsScreen from '../screens/AdminStatsScreen';
import ModeratorDashboardScreen from '../screens/ModeratorDashboardScreen';
import UserDashboardScreen from '../screens/UserDashboardScreen';
import ModeratorReportsScreen from '../screens/ModeratorReportsScreen';
import ModeratorUsersScreen from '../screens/ModeratorUsersScreen';
import ModeratorActivityScreen from '../screens/ModeratorActivityScreen';
import ModeratorChallengesScreen from '../screens/ModeratorChallengesScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminEventsScreen from '../screens/AdminEventsScreen';
import MyChallengesScreen from '../screens/MyChallengesScreen';
import MyStoriesScreen from '../screens/MyStoriesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SalesStatsScreen from '../screens/SalesStatsScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';
import OrganizerQRCodeScreen from '../screens/OrganizerQRCodeScreen';
import OrganizerEarningsScreen from '../screens/OrganizerEarningsScreen';
// import QRScannerScreen from '../screens/QRScannerScreen'; // Désactivé temporairement pour Expo Go

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  const [menuVisible, setMenuVisible] = React.useState(false);
  const insets = useSafeAreaInsets();

  // Calculer la hauteur de la barre de navigation avec le safe area
  const tabBarHeight = 60 + Math.max(insets.bottom, 20);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background.dark,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.light,
          },
          headerTintColor: colors.text.primary,
          headerLeft: () => (
            <View style={{ marginLeft: 16 }}>
              <AmpiaLogo size="sm" showText={true} />
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              style={{
                marginRight: 16,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.background.card,
                borderWidth: 1,
                borderColor: colors.border.light,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Menu size={20} color={colors.text.primary} />
            </TouchableOpacity>
          ),
          headerTitle: '',
          tabBarStyle: {
          backgroundColor: colors.background.dark,
          borderTopColor: colors.border.light,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary.purple,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="TicketsTab"
        component={MyTicketsScreen}
        options={{
          tabBarLabel: 'Billets',
          tabBarIcon: ({ color, size }) => <Ticket size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      </Tab.Navigator>
      
      <MobileMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a splash screen
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.dark },
        }}
      >
        <Stack.Screen name="Main" component={HomeTabs} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        <Stack.Screen name="SearchEvents" component={SearchEventsScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="MyFavorites" component={MyFavoritesScreen} />
        <Stack.Screen name="MyEvents" component={MyEventsScreen} />
        <Stack.Screen name="AdminStats" component={AdminStatsScreen} />
        <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
        <Stack.Screen name="AdminEvents" component={AdminEventsScreen} />
        <Stack.Screen name="ModeratorDashboard" component={ModeratorDashboardScreen} />
        <Stack.Screen name="ModeratorReports" component={ModeratorReportsScreen} />
        <Stack.Screen name="ModeratorUsers" component={ModeratorUsersScreen} />
        <Stack.Screen name="ModeratorActivity" component={ModeratorActivityScreen} />
        <Stack.Screen name="ModeratorChallenges" component={ModeratorChallengesScreen} />
        <Stack.Screen name="UserDashboard" component={UserDashboardScreen} />
        <Stack.Screen name="MyChallenges" component={MyChallengesScreen} />
        <Stack.Screen name="MyStories" component={MyStoriesScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="SalesStats" component={SalesStatsScreen} />
        <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
        <Stack.Screen name="OrganizerQRCode" component={OrganizerQRCodeScreen} />
        <Stack.Screen name="OrganizerEarnings" component={OrganizerEarningsScreen} />
        {/* <Stack.Screen name="QRScanner" component={QRScannerScreen} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
