import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';

type MenuNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

interface MenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen?: keyof RootStackParamList;
  action?: () => void;
}

export default function MenuScreen() {
  const navigation = useNavigation<MenuNavigationProp>();
  const { colorScheme, setThemeMode } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user, signOut } = useAuth();

  const mainMenuItems: MenuItem[] = [
    { id: 'profile', label: 'Profile', icon: 'person-outline', screen: 'Settings' },
    { id: 'chat', label: 'Chat', icon: 'chatbubble-outline', screen: 'Chat' },
    { id: 'coaching', label: 'Coaching', icon: 'fitness-outline', screen: 'Coaching' },
  ];

  const settingsMenuItems: MenuItem[] = [
    { id: 'settings', label: 'Settings', icon: 'settings-outline', screen: 'Settings' },
    { id: 'privacy', label: 'Privacy Center', icon: 'shield-outline', screen: 'PrivacyCenter' },
    { id: 'apps', label: 'Apps & Devices', icon: 'phone-portrait-outline', screen: 'AppsDevices' },
    { id: 'help', label: 'Help', icon: 'help-circle-outline', screen: 'Help' },
  ];

  const handleMenuPress = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.screen) {
      navigation.navigate(item.screen as any);
    }
  };

  const toggleTheme = () => {
    setThemeMode(colorScheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Menu</Text>
        </View>

        {/* User card */}
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <View
            style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user?.email || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.email?.split('@')[0] || 'Guest'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {user?.email || 'Not signed in'}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textTertiary}
          />
        </TouchableOpacity>

        {/* Main menu */}
        <View style={styles.section}>
          {mainMenuItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, { backgroundColor: colors.surface }]}
              onPress={() => handleMenuPress(item)}
            >
              <Ionicons name={item.icon} size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                {item.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings menu */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Settings
          </Text>
          {settingsMenuItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, { backgroundColor: colors.surface }]}
              onPress={() => handleMenuPress(item)}
            >
              <Ionicons name={item.icon} size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                {item.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Theme toggle */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
            onPress={toggleTheme}
          >
            <Ionicons
              name={colorScheme === 'dark' ? 'moon' : 'sunny-outline'}
              size={22}
              color={colors.text}
            />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              {colorScheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </Text>
            <View
              style={[
                styles.toggleTrack,
                {
                  backgroundColor:
                    colorScheme === 'dark'
                      ? colors.primary
                      : colors.surfaceSecondary,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: '#fff',
                    transform: [
                      { translateX: colorScheme === 'dark' ? 20 : 0 },
                    ],
                  },
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        {user && (
          <TouchableOpacity
            style={[styles.signOutButton, { backgroundColor: colors.surface }]}
            onPress={signOut}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            <Text style={[styles.signOutText, { color: colors.error }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        )}

        {/* Auth button for guests */}
        {!user && (
          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.authButtonText}>Sign In</Text>
          </TouchableOpacity>
        )}

        {/* Version */}
        <Text style={[styles.version, { color: colors.textTertiary }]}>
          Tribe Tracker v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
  },
  authButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
  },
});
