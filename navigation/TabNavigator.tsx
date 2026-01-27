import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useContext } from 'react';
import { TouchableOpacity, View } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import CreateChallengeScreen from '../screens/CreateChallengeScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import MenuScreen from '../screens/MenuScreen';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { TabParamList } from '../types';

const Tab = createBottomTabNavigator<TabParamList>();

// Custom tab bar button component
const CustomTabBarButton = ({ children, onPress, accessibilityState }: any) => {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const isFocused = accessibilityState?.selected;

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={14}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
      }}
      accessibilityState={accessibilityState}
    >
      <View
        style={{
          marginTop: 5,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
        {/* Current screen indicator */}
        {isFocused && (
          <View
            style={{
              position: 'absolute',
              bottom: -8,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.primary,
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function TabNavigator() {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  return (
    <Tab.Navigator
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
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: 34,
          paddingTop: 10,
          height: 80,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color}
            />
          ),
          tabBarButton: props => <CustomTabBarButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Challenges"
        component={CreateChallengeScreen}
        options={{
          title: 'Challenges',
          headerShown: false,
          tabBarLabel: 'Challenges',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'flag' : 'flag-outline'}
              size={22}
              color={color}
            />
          ),
          tabBarButton: props => <CustomTabBarButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: 'Leaderboards',
          tabBarLabel: 'Leaderboards',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'trophy' : 'trophy-outline'}
              size={22}
              color={color}
            />
          ),
          tabBarButton: props => <CustomTabBarButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          title: 'Menu',
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'menu' : 'menu-outline'}
              size={26}
              color={color}
            />
          ),
          tabBarButton: props => <CustomTabBarButton {...props} />,
        }}
      />
    </Tab.Navigator>
  );
}
