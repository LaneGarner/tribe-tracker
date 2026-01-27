import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState, AppDispatch } from '../redux/store';
import { updatePrivacySettings, updateProfile } from '../redux/slices/profileSlice';

export default function PrivacyCenterScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const profile = useSelector((state: RootState) => state.profile.data);

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
            <Switch
              value={profile?.profileVisible ?? true}
              onValueChange={toggleProfileVisible}
              trackColor={{ false: colors.surfaceSecondary, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Field Visibility
          </Text>
          {privacySettings.map(setting => (
            <TouchableOpacity
              key={setting.key}
              style={[styles.settingRow, { backgroundColor: colors.surface }]}
              onPress={() => toggleSetting(setting.key)}
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
              <Ionicons
                name={setting.value ? 'checkbox' : 'square-outline'}
                size={24}
                color={setting.value ? colors.primary : colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
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
            <Switch
              value={profile?.isChildAccount ?? false}
              onValueChange={toggleChildAccount}
              trackColor={{ false: colors.surfaceSecondary, true: colors.warning }}
              thumbColor="#fff"
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
});
