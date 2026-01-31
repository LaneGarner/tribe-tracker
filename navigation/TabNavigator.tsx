import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import React, { useContext, useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import CreateChallengeScreen from '../screens/CreateChallengeScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import MenuScreen from '../screens/MenuScreen';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { TabParamList } from '../types';

const Tab = createBottomTabNavigator<TabParamList>();

// Tab icon configuration
const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap; size: number }> = {
  Home: { focused: 'home', unfocused: 'home-outline', size: 22 },
  Challenges: { focused: 'flag', unfocused: 'flag-outline', size: 22 },
  Leaderboard: { focused: 'trophy', unfocused: 'trophy-outline', size: 22 },
  Menu: { focused: 'menu', unfocused: 'menu-outline', size: 26 },
};

const TIMING_CONFIG = {
  duration: 200,
  easing: Easing.out(Easing.cubic),
};

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 500;

const HORIZONTAL_MARGIN = 32;
const TAB_BAR_PADDING = 0;
const SELECTION_PILL_PADDING = 6;

// Exported constant for screens to use as bottom padding
export const TAB_BAR_HEIGHT = 80;

// Selection indicator component for the floating pill
const SelectionIndicator = ({
  indicatorStyle,
  colors,
  colorScheme,
}: {
  indicatorStyle: ReturnType<typeof useAnimatedStyle>;
  colors: ReturnType<typeof getColors>;
  colorScheme: 'light' | 'dark';
}) => {
  const useLiquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

  return (
    <Animated.View style={[styles.selectionIndicatorWrapper, indicatorStyle]}>
      {useLiquidGlass ? (
        <GlassView style={styles.selectionPill} isInteractive />
      ) : (
        <View
          style={[
            styles.selectionPill,
            {
              backgroundColor: 'rgba(120, 120, 128, 0.12)', // iOS system grey
            },
          ]}
        />
      )}
    </Animated.View>
  );
};

// Custom glass tab bar component
const GlassTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const insets = useSafeAreaInsets();

  // Track tab widths and positions for the sliding indicator
  const tabWidths = useRef<number[]>([]);
  const tabPositions = useRef<number[]>([]);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  // Navigate to tab by index (called from gesture handler)
  const navigateToIndex = (index: number) => {
    const route = state.routes[index];
    if (route) {
      navigation.navigate(route.name, route.params);
    }
  };

  // Calculate and animate indicator position when tab changes
  useEffect(() => {
    if (tabPositions.current.length > state.index && tabWidths.current.length > state.index) {
      const targetX = tabPositions.current[state.index];
      const targetWidth = tabWidths.current[state.index];

      indicatorX.value = withTiming(targetX, TIMING_CONFIG);
      indicatorWidth.value = withTiming(targetWidth, TIMING_CONFIG);
    }
  }, [state.index, indicatorX, indicatorWidth]);

  // Swipe gesture to change tabs
  const panGesture = Gesture.Pan()
    .onEnd((e) => {
      'worklet';
      const isSwipe = Math.abs(e.velocityX) > VELOCITY_THRESHOLD ||
                      Math.abs(e.translationX) > SWIPE_THRESHOLD;

      if (isSwipe) {
        if (e.translationX < 0 && state.index < state.routes.length - 1) {
          // Swipe left → next tab
          runOnJS(navigateToIndex)(state.index + 1);
        } else if (e.translationX > 0 && state.index > 0) {
          // Swipe right → previous tab
          runOnJS(navigateToIndex)(state.index - 1);
        }
      }
    });

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  const handleTabLayout = (index: number, x: number, width: number) => {
    tabPositions.current[index] = x;
    tabWidths.current[index] = width;

    // Initialize indicator position for the first tab
    if (index === state.index && indicatorWidth.value === 0) {
      indicatorX.value = x;
      indicatorWidth.value = width;
    }
  };

  const TabBarContent = () => (
    <View style={styles.tabBarContent}>
      {/* Animated selection indicator */}
      <SelectionIndicator
        indicatorStyle={indicatorStyle}
        colors={colors}
        colorScheme={colorScheme}
      />

      {/* Tab buttons */}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;
        const iconConfig = TAB_ICONS[route.name] || TAB_ICONS.Home;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            hitSlop={14}
            style={styles.tabButton}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              handleTabLayout(index, x, width);
            }}
          >
            <View style={styles.tabButtonContent}>
              <Ionicons
                name={isFocused ? iconConfig.focused : iconConfig.unfocused}
                size={iconConfig.size}
                color={isFocused ? colors.primary : colors.tabBarInactive}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? colors.primary : colors.tabBarInactive },
                ]}
              >
                {typeof label === 'string' ? label : route.name}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const containerStyle = [
    styles.tabBarContainer,
    { paddingBottom: insets.bottom > 0 ? insets.bottom - 16 : 4 },
  ];

  // Use liquid glass container on iOS 26+
  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return (
      <GestureDetector gesture={panGesture}>
        <View style={containerStyle}>
          <GlassView style={styles.tabBar}>
            <TabBarContent />
          </GlassView>
        </View>
      </GestureDetector>
    );
  }

  // Fallback for older iOS with blur
  if (Platform.OS === 'ios') {
    return (
      <GestureDetector gesture={panGesture}>
        <View style={containerStyle}>
          <BlurView
            intensity={80}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={styles.tabBar}
          >
            <TabBarContent />
          </BlurView>
        </View>
      </GestureDetector>
    );
  }

  // Android solid fallback
  return (
    <GestureDetector gesture={panGesture}>
      <View style={containerStyle}>
        <View style={[styles.tabBar, { backgroundColor: colors.tabBar }]}>
          <TabBarContent />
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: HORIZONTAL_MARGIN,
  },
  tabBar: {
    borderRadius: 100,
    overflow: 'hidden',
    paddingVertical: TAB_BAR_PADDING,
    paddingHorizontal: 4,
  },
  tabBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'relative',
  },
  selectionIndicatorWrapper: {
    position: 'absolute',
    top: SELECTION_PILL_PADDING,
    bottom: SELECTION_PILL_PADDING,
    left: 0,
  },
  selectionPill: {
    flex: 1,
    borderRadius: 100,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default function TabNavigator() {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  return (
    <Tab.Navigator
      tabBar={props => <GlassTabBar {...props} />}
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
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Challenges"
        component={CreateChallengeScreen}
        options={{
          title: 'Challenges',
          headerShown: false,
          tabBarLabel: 'Challenges',
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: 'Leaderboards',
          tabBarLabel: 'Leaderboards',
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          title: 'Menu',
          tabBarLabel: 'Menu',
        }}
      />
    </Tab.Navigator>
  );
}
