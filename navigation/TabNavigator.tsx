import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import HomeScreen from '../screens/HomeScreen';
import CreateChallengeScreen from '../screens/CreateChallengeScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import MenuScreen from '../screens/MenuScreen';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { TabParamList } from '../types';
import { TAB_BAR_HEIGHT } from '../constants/layout';
import { selectTotalUnreadCount } from '../redux/slices/chatSlice';
import HeaderChatButton from '../components/ui/HeaderChatButton';

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

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 500;

const TAB_BAR_PADDING = 0;
const SELECTION_PILL_PADDING = 6;
const PILL_HORIZONTAL_PADDING = 16; // padding on each side of content
const MIN_PILL_WIDTH = 72;


// Scale tab label font size based on screen width
const useTabLabelFontSize = () => {
  const { width } = useWindowDimensions();
  // 11pt at 390+ width, scaling down to ~9pt on SE (320)
  return Math.min(11, Math.max(8, width * 0.028));
};

// Tab button component
const TabButton = ({
  route,
  index,
  isFocused,
  iconConfig,
  label,
  colors,
  totalUnread,
  accessibilityLabel,
  onPress,
  onLongPress,
  onTabLayout,
  onContentLayout,
}: {
  route: { key: string; name: string };
  index: number;
  isFocused: boolean;
  iconConfig: { icon: keyof typeof Ionicons.glyphMap; size: number };
  label: string;
  colors: ReturnType<typeof getColors>;
  totalUnread: number;
  accessibilityLabel?: string;
  onPress: () => void;
  onLongPress: () => void;
  onTabLayout: (index: number, x: number, width: number) => void;
  onContentLayout: (index: number, width: number) => void;
}) => {
  const tabFontSize = useTabLabelFontSize();

  return (
    <TouchableOpacity
      key={route.key}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={{ top: 20, bottom: 20, left: 8, right: 8 }}
      style={styles.tabButton}
      onLayout={(e) => {
        const { x, width } = e.nativeEvent.layout;
        onTabLayout(index, x, width);
      }}
    >
      <View
        style={styles.tabButtonContent}
        onLayout={(e) => {
          onContentLayout(index, e.nativeEvent.layout.width);
        }}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={iconConfig.icon}
            size={iconConfig.size}
            color={isFocused ? colors.tabBarActive : colors.tabBarInactive}
          />
        </View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={[
            styles.tabLabel,
            {
              fontSize: tabFontSize,
              color: isFocused ? colors.tabBarActive : colors.tabBarInactive,
              fontWeight: isFocused ? '700' : '500',
            },
          ]}
        >
          {typeof label === 'string' ? label : route.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

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
  const { width: screenWidth } = useWindowDimensions();
  const totalUnread = useSelector(selectTotalUnreadCount);

  // Track tab widths and positions for the sliding indicator
  const tabWidths = useRef<number[]>([]);
  const tabPositions = useRef<number[]>([]);
  const contentWidths = useRef<number[]>([]);
  const [indicatorReady, setIndicatorReady] = useState(false);

  // Reset indicator measurements when tab count changes (feature flag toggle)
  const routeCount = state.routes.length;
  const prevRouteCount = useRef(routeCount);
  useEffect(() => {
    if (prevRouteCount.current !== routeCount) {
      prevRouteCount.current = routeCount;
      setIndicatorReady(false);
      tabWidths.current = [];
      tabPositions.current = [];
      contentWidths.current = [];
    }
  }, [routeCount]);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  // Navigate to tab by index (called from gesture handler)
  const navigateToIndex = (index: number) => {
    const route = state.routes[index];
    if (route) {
      navigation.navigate(route.name, route.params);
    }
  };

  // Calculate indicator position - sized to content with padding
  const calculateIndicatorPosition = (index: number, animate: boolean) => {
    const tabX = tabPositions.current[index];
    const tabWidth = tabWidths.current[index];
    const contentWidth = contentWidths.current[index];

    if (tabX === undefined || tabWidth === undefined || contentWidth === undefined) return;

    const pillWidth = Math.max(contentWidth + PILL_HORIZONTAL_PADDING * 2, MIN_PILL_WIDTH);
    const pillX = tabX + (tabWidth - pillWidth) / 2;

    if (animate) {
      indicatorX.value = withTiming(pillX, TIMING_CONFIG);
      indicatorWidth.value = withTiming(pillWidth, TIMING_CONFIG);
    } else {
      indicatorX.value = pillX;
      indicatorWidth.value = pillWidth;
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
        const label = (options.tabBarLabel ?? options.title ?? route.name) as string;
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

        const a11yLabel = route.name === 'Chat' && totalUnread > 0
          ? `Chat, ${totalUnread} unread message${totalUnread === 1 ? '' : 's'}`
          : options.tabBarAccessibilityLabel;

        return (
          <TabButton
            key={route.key}
            route={route}
            index={index}
            isFocused={isFocused}
            iconConfig={iconConfig}
            label={label}
            colors={colors}
            totalUnread={totalUnread}
            accessibilityLabel={a11yLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            onTabLayout={handleTabLayout}
            onContentLayout={handleContentLayout}
          />
        );
      })}
    </View>
  );

  // Check if the active screen has a custom background image
  const activeRoute = state.routes[state.index];
  const activeDescriptor = descriptors[activeRoute.key];
  const hasBackgroundImage = (activeDescriptor?.options as any)?.hasBackgroundImage ?? false;

  const horizontalMargin = screenWidth < 380 ? '1%' : '2%';
  const containerStyle = [
    styles.tabBarContainer,
    { left: horizontalMargin, right: horizontalMargin, paddingBottom: insets.bottom > 0 ? insets.bottom - 16 : 4 },
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
              shadowOpacity: colorScheme === 'dark' ? 0.4 : (hasBackgroundImage ? 0.4 : 0.15),
              shadowRadius: 12,
            },
          ]}
        >
          <BlurView
            intensity={80}
            tint="default"
            style={styles.tabBar}
          >
            <View style={[
              styles.frostedOverlay,
              {
                backgroundColor: colorScheme === 'dark'
                  ? 'rgba(20, 20, 20, 0.88)'
                  : 'rgba(255, 255, 255, 0.85)'
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
      <View style={[containerStyle, { elevation: hasBackgroundImage ? 16 : 8 }]}>
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
    left: '2%',
    right: '2%',
  },
  tabBar: {
    borderRadius: 100,
    overflow: 'hidden',
    paddingVertical: TAB_BAR_PADDING,
  },
  frostedOverlay: {
    borderRadius: 100,
    paddingHorizontal: 0,
  },
  tabBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
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
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
        headerRight: () => <HeaderChatButton />,
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
          title: 'Leaderboard',
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
