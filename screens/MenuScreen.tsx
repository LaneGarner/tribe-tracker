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
import { useSelector, useDispatch } from 'react-redux';
import { ThemeContext, ThemePreference, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { clearAllAppData, clearChatData } from '../utils/storage';
import { RootStackParamList } from '../types';
import { RootState, AppDispatch } from '../redux/store';
import { selectTotalUnreadCount, loadChatFromStorage } from '../redux/slices/chatSlice';
import SegmentedControl from '../components/SegmentedControl';
import Avatar from '../components/Avatar';
import { TAB_BAR_HEIGHT } from '../constants/layout';

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
  const { colorScheme, themePreference, setThemePreference } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const dispatch = useDispatch<AppDispatch>();
  const { user, signOut, getAccessToken } = useAuth();
  const profile = useSelector((state: RootState) => state.profile.data);
  const totalUnread = useSelector(selectTotalUnreadCount);

  const featureItems: MenuItem[] = [
    { id: 'badges', label: 'Badges', icon: 'ribbon-outline', screen: 'Badges' },
    { id: 'chat', label: 'Chat', icon: 'chatbubble-outline', screen: 'Chat' },
    { id: 'coaching', label: 'Coaching', icon: 'fitness-outline', screen: 'Coaching' },
  ];

  const settingsItems: MenuItem[] = [
    { id: 'apps', label: 'Apps & Devices', icon: 'phone-portrait-outline', screen: 'AppsDevices' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', screen: 'Notifications' },
    { id: 'preferences', label: 'Preferences', icon: 'globe-outline', screen: 'Preferences' },
  ];

  const legalSupportItems: MenuItem[] = [
    { id: 'privacy', label: 'Privacy Center', icon: 'shield-outline', screen: 'PrivacyCenter' },
    { id: 'terms', label: 'Terms of Service', icon: 'document-text-outline' },
    { id: 'privacyPolicy', label: 'Privacy Policy', icon: 'lock-closed-outline' },
    { id: 'help', label: 'Help', icon: 'help-circle-outline', screen: 'Help' },
  ];

  const handleClearChatData = () => {
    Alert.alert(
      'Clear Chat Data',
      'This will permanently delete all your chat history, conversations, and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const token = getAccessToken();
            await clearChatData(token);
            dispatch(loadChatFromStorage());
            Alert.alert('Done', 'Chat data has been cleared');
          },
        },
      ]
    );
  };

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

  const handleMenuPress = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.screen) {
      navigation.navigate(item.screen as any);
    }
  };

  const appearanceOptions: { value: ThemePreference; label: string; icon: any }[] = [
    { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
    { value: 'light', label: 'Light', icon: 'sunny-outline' },
    { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  ];

  const appearanceSubtitle =
    themePreference === 'system'
      ? 'Matches device settings'
      : themePreference === 'light'
        ? 'Always light'
        : 'Always dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User card - tap to view profile */}
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Profile')}
          disabled={!user}
        >
          <Avatar
            imageUrl={profile?.profilePhotoUrl}
            name={profile?.fullName}
            email={user?.email ?? undefined}
            size={48}
            style={{ marginRight: 12 }}
          />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {profile?.fullName || user?.email?.split('@')[0] || 'Guest'}
            </Text>
            {user && (
              <Text style={[styles.viewProfileText, { color: colors.textSecondary }]}>
                View Profile
              </Text>
            )}
          </View>
          {user && (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          )}
        </TouchableOpacity>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Appearance
          </Text>
          <View style={[styles.appearanceCard, { backgroundColor: colors.surface }]}>
            <SegmentedControl
              options={appearanceOptions}
              value={themePreference}
              onValueChange={setThemePreference}
              accessibilityLabel="Appearance mode"
            />
            <Text style={[styles.appearanceSubtitle, { color: colors.textSecondary }]}>
              {appearanceSubtitle}
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          {featureItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, { backgroundColor: colors.surface }]}
              onPress={() => handleMenuPress(item)}
            >
              <Ionicons name={item.icon} size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                {item.label}
              </Text>
              {item.id === 'chat' && totalUnread > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadBadgeText}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Text>
                </View>
              )}
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          {settingsItems.map(item => (
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

        {/* Legal & Support */}
        <View style={styles.section}>
          {legalSupportItems.map(item => (
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
          {/* Clear Chat Data */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
            onPress={handleClearChatData}
          >
            <Ionicons name="chatbubble-outline" size={22} color={colors.error} />
            <Text style={[styles.menuItemText, { color: colors.error }]}>
              Clear Chat Data
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
          {/* Clear All Data - destructive action */}
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
          Tribe Tracker v0.0.1
        </Text>
      </ScrollView>
    </View>
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
    paddingTop: 8,
    paddingBottom: TAB_BAR_HEIGHT + 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  viewProfileText: {
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
  appearanceCard: {
    padding: 12,
    borderRadius: 12,
  },
  appearanceSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
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
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 4,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
