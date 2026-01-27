import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
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
import SettingsScreen from '../screens/SettingsScreen';
import PrivacyCenterScreen from '../screens/PrivacyCenterScreen';
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
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Auth */}
      <Stack.Screen name="Auth" component={AuthScreen} />

      {/* Main app with tabs */}
      <Stack.Screen name="Main" component={TabNavigator} />

      {/* Core screens */}
      <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
      <Stack.Screen name="CreateChallenge" component={CreateChallengeScreen} />
      <Stack.Screen name="ViewMember" component={ViewMemberScreen} />
      <Stack.Screen name="ManageChild" component={ManageChildScreen} />
      <Stack.Screen name="TaskAnalytics" component={TaskAnalyticsScreen} />

      {/* Profile & Settings */}
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="PrivacyCenter" component={PrivacyCenterScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />

      {/* Placeholder screens */}
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Coaching" component={CoachingScreen} />
      <Stack.Screen name="AppsDevices" component={AppsDevicesScreen} />

      {/* Enterprise screens */}
      <Stack.Screen
        name="BuildingManagement"
        component={BuildingManagementScreen}
      />
      <Stack.Screen
        name="DistrictManagement"
        component={DistrictManagementScreen}
      />
      <Stack.Screen name="StaffManagement" component={StaffManagementScreen} />
      <Stack.Screen name="SystemAdmin" component={SystemAdminScreen} />
      <Stack.Screen name="FeatureToggles" component={FeatureTogglesScreen} />
    </Stack.Navigator>
  );
}
