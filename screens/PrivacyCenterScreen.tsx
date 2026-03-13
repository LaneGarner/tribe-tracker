import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState, AppDispatch } from '../redux/store';
import { updatePrivacySettings, updateProfile } from '../redux/slices/profileSlice';
import { removeBlockedUser } from '../redux/slices/chatSlice';
import Toggle from '../components/Toggle';
import Avatar from '../components/Avatar';

export default function PrivacyCenterScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const profile = useSelector((state: RootState) => state.profile.data);
  const blockedUsers = useSelector((state: RootState) => state.chat.blockedUsers);

  const privacySettings = [
    {
      key: 'hideEmail',
      label: 'Hide Email',
      description: 'Your email will not be visible to other users',
      value: profile?.hideEmail ?? false,
    },
    {
      key: 'hideAge',
      label: 'Hide Age',
      description: 'Your age will not be visible to other users',
      value: profile?.hideAge ?? false,
    },
    {
      key: 'hideHeight',
      label: 'Hide Height',
      description: 'Your height will not be visible to other users',
      value: profile?.hideHeight ?? false,
    },
    {
      key: 'hideWeight',
      label: 'Hide Weight',
      description: 'Your weight will not be visible to other users',
      value: profile?.hideWeight ?? false,
    },
    {
      key: 'hideLocation',
      label: 'Hide Location',
      description: 'Your city and state will not be visible to other users',
      value: profile?.hideLocation ?? false,
    },
    {
      key: 'hideBio',
      label: 'Hide Bio',
      description: 'Your bio will not be visible to other users',
      value: profile?.hideBio ?? false,
    },
  ];

  const toggleSetting = (key: string) => {
    dispatch(
      updatePrivacySettings({
        [key]: !profile?.[key as keyof typeof profile],
      })
    );
  };

  const toggleChildAccount = () => {
    dispatch(updateProfile({ isChildAccount: !profile?.isChildAccount }));
  };

  const toggleProfileVisible = () => {
    dispatch(updateProfile({ profileVisible: !profile?.profileVisible }));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.intro}>
          <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
          <Text style={[styles.introTitle, { color: colors.text }]}>
            Your Privacy Matters
          </Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Control what information other challenge participants can see about
            you.
          </Text>
        </View>

        {/* Privacy Section - Profile Visibility */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>
              Privacy
            </Text>
          </View>
          <View style={[styles.visibilityCard, { backgroundColor: colors.surface }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Profile Visibility
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Make profile visible to others
              </Text>
            </View>
            <Toggle
              value={profile?.profileVisible ?? true}
              onValueChange={toggleProfileVisible}
              accessibilityLabel="Toggle profile visibility"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Field Visibility
          </Text>
          {privacySettings.map(setting => (
            <View
              key={setting.key}
              style={[styles.settingRow, { backgroundColor: colors.surface }]}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  {setting.label}
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {setting.description}
                </Text>
              </View>
              <Toggle
                value={setting.value}
                onValueChange={() => toggleSetting(setting.key)}
                accessibilityLabel={`Toggle ${setting.label}`}
              />
            </View>
          ))}
        </View>

        {/* Blocked Users */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="ban-outline" size={20} color={colors.error} />
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>
              Blocked Users
            </Text>
          </View>
          {blockedUsers.length > 0 ? (
            blockedUsers.map(blocked => (
              <View
                key={blocked.id}
                style={[styles.blockedUserRow, { backgroundColor: colors.surface }]}
              >
                <Avatar
                  imageUrl={blocked.blockedPhotoUrl}
                  name={blocked.blockedName}
                  size={36}
                />
                <Text style={[styles.blockedUserName, { color: colors.text }]} numberOfLines={1}>
                  {blocked.blockedName || 'Unknown User'}
                </Text>
                <TouchableOpacity
                  style={[styles.unblockButton, { borderColor: colors.border }]}
                  onPress={() => {
                    Alert.alert(
                      'Unblock User',
                      `Unblock ${blocked.blockedName || 'this user'}? They will be able to send you messages again.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Unblock',
                          onPress: () => dispatch(removeBlockedUser(blocked.id)),
                        },
                      ]
                    );
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Unblock ${blocked.blockedName || 'user'}`}
                >
                  <Text style={[styles.unblockText, { color: colors.primary }]}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyBlockedText, { color: colors.textSecondary }]}>
              No blocked users
            </Text>
          )}
        </View>

        {/* Account Type */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={20} color={colors.text} />
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>
              Account Type
            </Text>
          </View>
          <View
            style={[
              styles.accountTypeCard,
              { backgroundColor: colors.warning + '15' },
            ]}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Child Account (Under 13)
              </Text>
              <Text
                style={[styles.settingDescription, { color: colors.textSecondary }]}
              >
                Child accounts require adult supervision
              </Text>
            </View>
            <Toggle
              value={profile?.isChildAccount ?? false}
              onValueChange={toggleChildAccount}
              variant="warning"
              accessibilityLabel="Toggle child account"
            />
          </View>
        </View>
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
    paddingBottom: 24,
  },
  intro: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  blockedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  blockedUserName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  unblockButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  unblockText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyBlockedText: {
    fontSize: 14,
    paddingLeft: 4,
    paddingVertical: 8,
  },
});
