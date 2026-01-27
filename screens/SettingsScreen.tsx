import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { clearAllAppData } from '../utils/storage';
import { RootStackParamList } from '../types';

type SettingsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavigationProp>();
  const { colorScheme, setThemeMode } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user, signOut } = useAuth();

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your local data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllAppData();
            Alert.alert('Done', 'All data has been cleared');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Account
          </Text>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('PrivacyCenter')}
          >
            <Ionicons name="shield-outline" size={22} color={colors.text} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Privacy Center
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.text}
            />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Notifications
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Appearance
          </Text>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
            onPress={() =>
              setThemeMode(colorScheme === 'dark' ? 'light' : 'dark')
            }
          >
            <Ionicons
              name={colorScheme === 'dark' ? 'moon' : 'sunny-outline'}
              size={22}
              color={colors.text}
            />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Dark Mode
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

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Data
          </Text>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
            onPress={handleClearData}
          >
            <Ionicons name="trash-outline" size={22} color={colors.error} />
            <Text style={[styles.menuItemText, { color: colors.error }]}>
              Clear All Data
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Support
          </Text>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Help')}
          >
            <Ionicons
              name="help-circle-outline"
              size={22}
              color={colors.text}
            />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Help & Support
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
          >
            <Ionicons
              name="document-text-outline"
              size={22}
              color={colors.text}
            />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Terms of Service
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Privacy Policy
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        {user && (
          <>
            <Text style={[styles.loggedInAs, { color: colors.textSecondary }]}>
              Signed in as {user.email}
            </Text>
            <TouchableOpacity
              style={[styles.signOutButton, { backgroundColor: colors.surface }]}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
              <Text style={[styles.signOutText, { color: colors.error }]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Sign In */}
        {!user && (
          <TouchableOpacity
            style={[styles.signInButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Auth')}
          >
            <Ionicons name="log-in-outline" size={22} color="#fff" />
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        )}

        {/* Version */}
        <Text style={[styles.version, { color: colors.textTertiary }]}>
          Version 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  loggedInAs: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 8,
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
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  signInText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
  },
});
