import { Ionicons } from '@expo/vector-icons';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import type { AppleIcon } from 'react-native-bottom-tabs';
import React, { useContext } from 'react';
import { ImageSourcePropType, Platform } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import MenuScreen from '../screens/MenuScreen';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { TabParamList } from '../types';

const Tab = createNativeBottomTabNavigator<TabParamList>();

// getImageSourceSync exists at runtime (inherited from react-native-vector-icons)
// but isn't surfaced on @expo/vector-icons' typings.
const getIoniconSource = (
  name: keyof typeof Ionicons.glyphMap,
  size: number,
  color: string,
): ImageSourcePropType =>
  (Ionicons as unknown as {
    getImageSourceSync: (n: string, s: number, c: string) => ImageSourcePropType;
  }).getImageSourceSync(name, size, color);

// Builds a cross-platform tab icon: real SF Symbols on iOS (so the system
// liquid-glass bar renders them natively), and a rasterized Ionicon image
// source on Android (the native bar can't take SF Symbols there).
const makeTabIcon =
  (sfSymbol: string, ionicon: keyof typeof Ionicons.glyphMap, tintColor: string) =>
  ({ focused }: { focused: boolean }): ImageSourcePropType | AppleIcon => {
    if (Platform.OS === 'ios') {
      // Menu uses a glyph with no ".fill" variant.
      const hasFill = sfSymbol !== 'line.3.horizontal';
      return { sfSymbol: hasFill && focused ? `${sfSymbol}.fill` : sfSymbol } as AppleIcon;
    }
    return getIoniconSource(ionicon, 24, tintColor);
  };

export default function TabNavigatorNative() {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  return (
    <Tab.Navigator
      labeled
      translucent
      tabBarActiveTintColor={colors.tabBarActive}
      tabBarInactiveTintColor={colors.tabBarInactive}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: makeTabIcon('house', 'home', colors.tabBarInactive),
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          title: 'Discover',
          tabBarLabel: 'Discover',
          tabBarIcon: makeTabIcon('flag', 'flag', colors.tabBarInactive),
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: 'Leaderboard',
          tabBarLabel: 'Leaderboards',
          tabBarIcon: makeTabIcon('trophy', 'trophy', colors.tabBarInactive),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          title: 'Menu',
          tabBarLabel: 'Menu',
          tabBarIcon: makeTabIcon('line.3.horizontal', 'menu', colors.tabBarInactive),
        }}
      />
    </Tab.Navigator>
  );
}
