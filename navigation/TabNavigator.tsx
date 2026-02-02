import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
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
import { TAB_BAR_HEIGHT } from '../constants/layout';

const Tab = createBottomTabNavigator<TabParamList>();

// Tab icon configuration - all filled icons, color changes on focus
const TAB_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; size: number }> = {
  Home: { icon: 'home', size: 22 },
  Challenges: { icon: 'flag', size: 22 },
  Leaderboard: { icon: 'trophy', size: 22 },
  Menu: { icon: 'menu', size: 26 },
};

const TIMING_CONFIG = {
  duration: 200,
  easing: Easing.out(Easing.cubic),
};

const EXPAND_SPRING_CONFIG = {
  damping: 7,
  stiffness: 300,
  mass: 0.4,
};

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 500;

const TAB_BAR_PADDING = 0;
const SELECTION_PILL_PADDING = 6;
const SELECTION_PILL_HORIZONTAL_INSET = 4;  // Original default inset from tab edges
const MIN_CONTENT_PADDING = 20;              // Minimum padding around content


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
  return (
    <Animated.View style={[styles.selectionIndicatorWrapper, indicatorStyle]}>
      <View
        style={[
          styles.selectionPill,
          {
            backgroundColor: colorScheme === 'dark'
              ? 'rgba(60, 60, 60, 0.8)'
              : 'rgba(120, 120, 128, 0.12)',
          },
        ]}
      />
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
  const contentWidths = useRef<number[]>([]);
  const [indicatorReady, setIndicatorReady] = useState(false);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  // Navigate to tab by index (called from gesture handler)
  const navigateToIndex = (index: number) => {
    const route = state.routes[index];
    if (route) {
      navigation.navigate(route.name, route.params);
    }
  };

  // Calculate indicator position - uses default size, expands if content too tight
  const calculateIndicatorPosition = (index: number, animate: boolean) => {
    const tabX = tabPositions.current[index];
    const tabWidth = tabWidths.current[index];
    const contentWidth = contentWidths.current[index];

    if (tabX === undefined || tabWidth === undefined) return;

    // Default pill size (original behavior - minimum size)
    const defaultPillX = tabX + SELECTION_PILL_HORIZONTAL_INSET;
    const defaultPillWidth = tabWidth - SELECTION_PILL_HORIZONTAL_INSET * 2;

    // Check if content needs more room
    let finalPillX = defaultPillX;
    let finalPillWidth = defaultPillWidth;

    if (contentWidth !== undefined) {
      const currentPadding = (defaultPillWidth - contentWidth) / 2;

      if (currentPadding < MIN_CONTENT_PADDING) {
        // Content too tight - expand pill
        finalPillWidth = contentWidth + MIN_CONTENT_PADDING * 2;
        const contentX = tabX + (tabWidth - contentWidth) / 2;
        finalPillX = contentX - MIN_CONTENT_PADDING;
      }
    }

    if (animate) {
      // Animate to default first
      indicatorX.value = withTiming(defaultPillX, TIMING_CONFIG);
      indicatorWidth.value = withTiming(defaultPillWidth, TIMING_CONFIG);

      // If expansion needed, animate after landing with bounce
      if (finalPillX !== defaultPillX || finalPillWidth !== defaultPillWidth) {
        setTimeout(() => {
          indicatorX.value = withSpring(finalPillX, EXPAND_SPRING_CONFIG);
          indicatorWidth.value = withSpring(finalPillWidth, EXPAND_SPRING_CONFIG);
        }, TIMING_CONFIG.duration);
      }
    } else {
      // Initial render - set final values immediately (no two-phase on load)
      indicatorX.value = finalPillX;
      indicatorWidth.value = finalPillWidth;
    }
  };

  // Animate indicator position when tab changes
  useEffect(() => {
    calculateIndicatorPosition(state.index, true);
  }, [state.index]);

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
    maybeInitializeIndicator(index);
  };

  const handleContentLayout = (index: number, width: number) => {
    contentWidths.current[index] = width;
    maybeInitializeIndicator(index);
  };

  // Initialize indicator once we have all measurements for the selected tab
  const maybeInitializeIndicator = (index: number) => {
    if (indicatorReady) return;
    if (index !== state.index) return;

    const hasAllMeasurements =
      tabPositions.current[index] !== undefined &&
      tabWidths.current[index] !== undefined &&
      contentWidths.current[index] !== undefined;

    if (hasAllMeasurements) {
      calculateIndicatorPosition(index, false);
      requestAnimationFrame(() => {
        setIndicatorReady(true);
      });
    }
  };

  const TabBarContent = () => (
    <View style={styles.tabBarContent}>
      {/* Animated selection indicator - only render when initialized */}
      {indicatorReady && (
        <SelectionIndicator
          indicatorStyle={indicatorStyle}
          colors={colors}
          colorScheme={colorScheme}
        />
      )}

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
            hitSlop={{ top: 20, bottom: 20, left: 8, right: 8 }}
            style={styles.tabButton}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              handleTabLayout(index, x, width);
            }}
          >
            <View
              style={styles.tabButtonContent}
              onLayout={(e) => {
                handleContentLayout(index, e.nativeEvent.layout.width);
              }}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={iconConfig.icon}
                  size={iconConfig.size}
                  color={isFocused ? colors.primary : colors.tabBarInactive}
                />
              </View>
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

  // iOS with blur
  if (Platform.OS === 'ios') {
    return (
      <GestureDetector gesture={panGesture}>
        <View
          style={[
            containerStyle,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.15,
              shadowRadius: 12,
            },
          ]}
        >
          <BlurView
            intensity={50}
            tint="default"
            style={styles.tabBar}
          >
            <View style={[
              styles.frostedOverlay,
              {
                backgroundColor: colorScheme === 'dark'
                  ? 'rgba(30, 30, 30, 0.8)'
                  : 'rgba(255, 255, 255, 0.75)'
              }
            ]}>
              <TabBarContent />
            </View>
          </BlurView>
        </View>
      </GestureDetector>
    );
  }

  // Android translucent fallback
  return (
    <GestureDetector gesture={panGesture}>
      <View style={[containerStyle, { elevation: 8 }]}>
        <View style={[
          styles.tabBar,
          {
            backgroundColor: colorScheme === 'dark'
              ? 'rgba(24, 24, 27, 0.95)'
              : 'rgba(255, 255, 255, 0.92)',
            borderWidth: 0.5,
            borderColor: 'rgba(0, 0, 0, 0.1)',
          }
        ]}>
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
    left: '5%',
    right: '5%',
  },
  tabBar: {
    borderRadius: 100,
    overflow: 'hidden',
    paddingVertical: TAB_BAR_PADDING,
    paddingHorizontal: 4,
  },
  frostedOverlay: {
    borderRadius: 100,
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
  iconContainer: {
    height: 26,
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
