import Constants, { ExecutionEnvironment } from 'expo-constants';
import React from 'react';
import { Platform } from 'react-native';
import TabNavigatorClassic from './TabNavigatorClassic';
import TabNavigatorNative from './TabNavigatorNative';

// The native Liquid Glass tab bar is an iOS presentation. It relies on native
// APIs that aren't present in Expo Go and its icon contract differs on Android.
// Keep Android on the cross-platform glass tab bar so signed Android builds do
// not attempt to render iOS-native tab icon sources.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function TabNavigator() {
  const shouldUseNativeTabs = Platform.OS === 'ios' && !isExpoGo;

  return shouldUseNativeTabs ? <TabNavigatorNative /> : <TabNavigatorClassic />;
}
