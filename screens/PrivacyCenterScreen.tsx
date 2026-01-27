import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState, AppDispatch } from '../redux/store';
import { updatePrivacySettings } from '../redux/slices/profileSlice';

export default function PrivacyCenterScreen() {
  const navigation = useNavigation();
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
          Privacy Center
        </Text>
        <View style={{ width: 40 }} />
      </View>

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

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Profile Visibility
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
