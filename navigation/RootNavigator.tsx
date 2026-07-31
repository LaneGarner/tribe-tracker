import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootStackParamList } from '../types';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { RootState } from '../redux/store';
import { hasSeenWizard } from '../utils/storage';
import TabNavigator from './TabNavigator';

// Auth screen
import AuthScreen from '../screens/AuthScreen';

// Core screens
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import TaskAnalyticsScreen from '../screens/TaskAnalyticsScreen';

// Profile & Settings screens
import ProfileScreen from '../screens/ProfileScreen';
import PrivacyCenterScreen from '../screens/PrivacyCenterScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationInboxScreen from '../screens/NotificationInboxScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import MembershipScreen from '../screens/MembershipScreen';
import PaywallScreen from '../screens/PaywallScreen';
import OrganizationsScreen from '../screens/OrganizationsScreen';
import OrganizationDetailScreen from '../screens/OrganizationDetailScreen';
import OrganizationInviteScreen from '../screens/OrganizationInviteScreen';
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

// Badges screen
import BadgesScreen from '../screens/BadgesScreen';
import { withCapabilityGate } from '../components/membership/withCapabilityGate';
import { withAIConsentGate } from '../components/membership/withAIConsentGate';

// Onboarding wizard (first-run)
import OnboardingWizardScreen from '../screens/OnboardingWizardScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const ProAnalyticsScreen = withCapabilityGate(
  TaskAnalyticsScreen,
  'canViewAnalytics',
  'Advanced analytics are part of Pro'
);
const ProCoachingScreen = withCapabilityGate(
  withAIConsentGate(CoachingScreen),
  'canUseEnhancedAccountability',
  'Personalized coaching is part of Pro'
);

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

  // Local flag persists independently of the profile row so that users who
  // skip the wizard don't see it again even if the server profile lacks the
  // onboardingCompleted column or clobbers local state.
  const [wizardSeen, setWizardSeenState] = useState<boolean | null>(null);
  useEffect(() => {
    hasSeenWizard().then(setWizardSeenState);
  }, []);

  // If the user is authenticated but the profile is null after we've
  // resolved, they have no profile row yet — treat as needing onboarding.
  // Otherwise check the flag explicitly. Local wizardSeen flag short-circuits
  // the profile check.
  const needsOnboarding =
    !!user &&
    profileResolved &&
    !wizardSeen &&
    profileData?.onboardingCompleted !== true;

  // While the user is authenticated but the profile hasn't resolved, or the
  // wizard-seen flag hasn't loaded yet, render a lightweight loading view
  // rather than Main (prevents flash of Main -> wizard redirect).
  const profileStillLoading =
    !!user && (!profileResolved || wizardSeen === null);

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
            name="TaskAnalytics"
            component={ProAnalyticsScreen}
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
            name="NotificationInbox"
            component={NotificationInboxScreen}
            options={{ title: 'Updates' }}
          />
          <Stack.Screen
            name="Preferences"
            component={PreferencesScreen}
            options={{ title: 'Preferences' }}
          />
          <Stack.Screen
            name="Membership"
            component={MembershipScreen}
            options={{ title: 'Membership' }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ title: 'TribeTracker Pro', presentation: 'modal' }}
          />
          <Stack.Screen
            name="Organizations"
            component={OrganizationsScreen}
            options={{ title: 'Organizations' }}
          />
          <Stack.Screen
            name="OrganizationDetail"
            component={OrganizationDetailScreen}
            options={{ title: 'Organization' }}
          />
          <Stack.Screen
            name="OrganizationInvite"
            component={OrganizationInviteScreen}
            options={{ title: 'Organization Invitation' }}
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
            component={ProCoachingScreen}
            options={{ title: 'Coaching' }}
          />
          <Stack.Screen
            name="AppsDevices"
            component={AppsDevicesScreen}
            options={{ title: 'Apps & Devices' }}
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
