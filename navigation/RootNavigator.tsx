import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootStackParamList } from '../types';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { RootState } from '../redux/store';
import TabNavigator from './TabNavigator';

// Auth screen
import AuthScreen from '../screens/AuthScreen';

// Core screens
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import ManageChildScreen from '../screens/ManageChildScreen';
import TaskAnalyticsScreen from '../screens/TaskAnalyticsScreen';

// Profile & Settings screens
import ProfileScreen from '../screens/ProfileScreen';
import PrivacyCenterScreen from '../screens/PrivacyCenterScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import HelpScreen from '../screens/HelpScreen';

// Chat screens
import ChatScreen from '../screens/ChatScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import DirectMessageScreen from '../screens/DirectMessageScreen';
import NewDmScreen from '../screens/NewDmScreen';
import NewGroupChatScreen from '../screens/NewGroupChatScreen';

// Placeholder screens
import CoachingScreen from '../screens/CoachingScreen';
import AppsDevicesScreen from '../screens/AppsDevicesScreen';

// Enterprise screens
import BuildingManagementScreen from '../screens/BuildingManagementScreen';
import DistrictManagementScreen from '../screens/DistrictManagementScreen';
import StaffManagementScreen from '../screens/StaffManagementScreen';
import SystemAdminScreen from '../screens/SystemAdminScreen';
import FeatureTogglesScreen from '../screens/FeatureTogglesScreen';

// Badges screen
import BadgesScreen from '../screens/BadgesScreen';

// Onboarding wizard (first-run)
import OnboardingWizardScreen from '../screens/OnboardingWizardScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user } = useAuth();
  const profileData = useSelector((state: RootState) => state.profile.data);
  const profileLoading = useSelector(
    (state: RootState) => state.profile.loading
  );
  const profileHasFetched = useSelector(
    (state: RootState) => state.profile.hasFetchedFromServer
  );

  // We consider the profile "resolved" once we've attempted a server fetch
  // (success or fail), OR once we have local data AND are not actively
  // loading. This prevents:
  //   - Flash of Main before wizard for existing users with
  //     onboardingCompleted !== true
  //   - Flash of wizard for users who HAVE completed onboarding (we wait
  //     until data is in)
  const profileResolved =
    !profileLoading && (profileHasFetched || profileData !== null);

  // If the user is authenticated but the profile is null after we've
  // resolved, they have no profile row yet — treat as needing onboarding.
  // Otherwise check the flag explicitly.
  const needsOnboarding =
    !!user && profileResolved && profileData?.onboardingCompleted !== true;

  // While the user is authenticated but the profile hasn't resolved, render
  // a lightweight loading view rather than Main (prevents flash of Main ->
  // wizard redirect).
  const profileStillLoading = !!user && !profileResolved;

  if (profileStillLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        headerBackTitle: 'Back',
      }}
    >
      {!user ? (
        // Not logged in - show only auth screen
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      ) : (
        // Logged in - show main app
        <>
          {needsOnboarding ? (
            <Stack.Screen
              name="OnboardingWizard"
              component={OnboardingWizardScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
          ) : null}

          {/* Main app with tabs - tabs have their own headers */}
          <Stack.Screen
            name="Main"
            component={TabNavigator}
            options={{ headerShown: false }}
          />

          {/* Always register OnboardingWizard so it can be opened manually */}
          {!needsOnboarding ? (
            <Stack.Screen
              name="OnboardingWizard"
              component={OnboardingWizardScreen}
              options={{ headerShown: false }}
            />
          ) : null}

          {/* Core screens */}
          <Stack.Screen
            name="ChallengeDetail"
            component={ChallengeDetailScreen}
            options={{ title: 'Challenge' }}
          />
          <Stack.Screen
            name="CreateChallenge"
            component={DiscoverScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ViewMember"
            component={ProfileScreen}
            options={{ title: 'Profile' }}
          />
          <Stack.Screen
            name="ManageChild"
            component={ManageChildScreen}
            options={{ title: 'Manage Child' }}
          />
          <Stack.Screen
            name="TaskAnalytics"
            component={TaskAnalyticsScreen}
            options={{ title: 'Analytics' }}
          />

          {/* Profile & Settings */}
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'Profile' }}
          />
          <Stack.Screen
            name="PrivacyCenter"
            component={PrivacyCenterScreen}
            options={{ title: 'Privacy Center' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ title: 'Notifications' }}
          />
          <Stack.Screen
            name="Preferences"
            component={PreferencesScreen}
            options={{ title: 'Preferences' }}
          />
          <Stack.Screen
            name="Help"
            component={HelpScreen}
            options={{ title: 'Help & Support' }}
          />

          {/* Chat screens */}
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ title: 'Tribe Chat' }}
          />
          <Stack.Screen
            name="GroupChat"
            component={GroupChatScreen}
            options={({ route }) => ({
              title: (route.params as { groupName?: string })?.groupName || 'Group Chat',
            })}
          />
          <Stack.Screen
            name="DirectMessage"
            component={DirectMessageScreen}
            options={({ route }) => ({
              title: (route.params as { otherUserName?: string })?.otherUserName || 'Message',
            })}
          />
<Stack.Screen
            name="NewDm"
            component={NewDmScreen}
            options={{ title: 'New Message' }}
          />
          <Stack.Screen
            name="NewGroupChat"
            component={NewGroupChatScreen}
            options={{ title: 'New Group Chat' }}
          />

          {/* Placeholder screens */}
          <Stack.Screen
            name="Coaching"
            component={CoachingScreen}
            options={{ title: 'Coaching' }}
          />
          <Stack.Screen
            name="AppsDevices"
            component={AppsDevicesScreen}
            options={{ title: 'Apps & Devices' }}
          />

          {/* Enterprise screens */}
          <Stack.Screen
            name="BuildingManagement"
            component={BuildingManagementScreen}
            options={{ title: 'Building Management' }}
          />
          <Stack.Screen
            name="DistrictManagement"
            component={DistrictManagementScreen}
            options={{ title: 'District Management' }}
          />
          <Stack.Screen
            name="StaffManagement"
            component={StaffManagementScreen}
            options={{ title: 'Staff Management' }}
          />
          <Stack.Screen
            name="SystemAdmin"
            component={SystemAdminScreen}
            options={{ title: 'System Admin' }}
          />
          <Stack.Screen
            name="FeatureToggles"
            component={FeatureTogglesScreen}
            options={{ title: 'Feature Toggles' }}
          />

          {/* Badges */}
          <Stack.Screen
            name="Badges"
            component={BadgesScreen}
            options={{ title: 'Badges' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
