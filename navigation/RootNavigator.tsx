import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import TabNavigator from './TabNavigator';

// Auth screen
import AuthScreen from '../screens/AuthScreen';

// Core screens
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import CreateChallengeScreen from '../screens/CreateChallengeScreen';
import ViewMemberScreen from '../screens/ViewMemberScreen';
import ManageChildScreen from '../screens/ManageChildScreen';
import TaskAnalyticsScreen from '../screens/TaskAnalyticsScreen';

// Profile & Settings screens
import ProfileScreen from '../screens/ProfileScreen';
import PrivacyCenterScreen from '../screens/PrivacyCenterScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import HelpScreen from '../screens/HelpScreen';

// Placeholder screens
import ChatScreen from '../screens/ChatScreen';
import CoachingScreen from '../screens/CoachingScreen';
import AppsDevicesScreen from '../screens/AppsDevicesScreen';

// Enterprise screens
import BuildingManagementScreen from '../screens/BuildingManagementScreen';
import DistrictManagementScreen from '../screens/DistrictManagementScreen';
import StaffManagementScreen from '../screens/StaffManagementScreen';
import SystemAdminScreen from '../screens/SystemAdminScreen';
import FeatureTogglesScreen from '../screens/FeatureTogglesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  return (
    <Stack.Navigator
      initialRouteName="Main"
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
      {/* Auth */}
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{ headerShown: false }}
      />

      {/* Main app with tabs - tabs have their own headers */}
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />

      {/* Core screens */}
      <Stack.Screen
        name="ChallengeDetail"
        component={ChallengeDetailScreen}
        options={{ title: 'Challenge' }}
      />
      <Stack.Screen
        name="CreateChallenge"
        component={CreateChallengeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ViewMember"
        component={ViewMemberScreen}
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

      {/* Placeholder screens */}
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Chat' }}
      />
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
    </Stack.Navigator>
  );
}
