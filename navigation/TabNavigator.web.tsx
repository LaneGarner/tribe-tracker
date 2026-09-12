import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useContext } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { selectTotalUnreadCount } from '../redux/slices/chatSlice';
import HomeScreen from '../screens/HomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import MenuScreen from '../screens/MenuScreen';
import ChatScreen from '../screens/ChatScreen';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { TabParamList } from '../types';
import { webTabPlacementForWidth } from './webNavigationLayout';

const Tab = createBottomTabNavigator<TabParamList>();
const ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home', Discover: 'flag', Leaderboard: 'trophy', Chat: 'chatbubble', Menu: 'menu',
};

function WebTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const unread = useSelector(selectTotalUnreadCount);
  const isSidebar = webTabPlacementForWidth(width) === 'left';

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.navigation, isSidebar ? styles.sidebar : styles.bottomBar, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        paddingBottom: isSidebar ? 24 : Math.max(insets.bottom, 8),
      }]}
    >
      {isSidebar ? (
        <View style={styles.brand}>
          <Text style={[styles.brandMark, { color: colors.primary }]}>TT</Text>
          <Text style={[styles.brandName, { color: colors.text }]}>TribeTracker</Text>
        </View>
      ) : null}
      <View style={isSidebar ? styles.sidebarItems : styles.bottomItems}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const label = String(descriptor.options.tabBarLabel ?? descriptor.options.title ?? route.name);
          const selected = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={route.name === 'Chat' && unread > 0
                ? `${label}, ${unread} unread message${unread === 1 ? '' : 's'}`
                : descriptor.options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [
                styles.item,
                isSidebar ? styles.sidebarItem : styles.bottomItem,
                selected && { backgroundColor: colors.surfaceSecondary },
                pressed && styles.pressedItem,
              ]}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={ICONS[route.name as keyof TabParamList] ?? 'ellipse'} size={isSidebar ? 22 : 21} color={selected ? colors.primary : colors.textSecondary} />
                {route.name === 'Chat' && unread > 0 ? (
                  <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={[
                isSidebar ? styles.sidebarLabel : styles.bottomLabel,
                !isSidebar && width <= 360 && styles.compactBottomLabel,
                { color: selected ? colors.text : colors.textSecondary },
                selected && styles.selectedLabel,
              ]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {isSidebar ? <Text style={[styles.sidebarHint, { color: colors.textTertiary }]}>Build better habits together.</Text> : null}
    </View>
  );
}

export default function TabNavigator() {
  const { width } = useWindowDimensions();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  return (
    <Tab.Navigator
      tabBar={props => <WebTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: webTabPlacementForWidth(width),
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Discover" component={DiscoverScreen} options={{ title: 'Discover' }} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboards' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Tab.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  navigation: { flexShrink: 0 },
  sidebar: { width: 240, minHeight: '100%', paddingHorizontal: 16, paddingTop: 28, borderRightWidth: StyleSheet.hairlineWidth },
  bottomBar: { width: '100%', paddingTop: 7, paddingHorizontal: 8, borderTopWidth: StyleSheet.hairlineWidth },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 },
  brandMark: { fontSize: 18, lineHeight: 34, fontWeight: '900' },
  brandName: { fontSize: 19, lineHeight: 34, fontWeight: '700' },
  sidebarItems: { flex: 1, gap: 6, marginTop: 32 },
  bottomItems: { flexDirection: 'row', width: '100%', maxWidth: 720, alignSelf: 'center' },
  item: { borderRadius: 10 },
  pressedItem: { opacity: 0.72 },
  sidebarItem: { minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bottomItem: { flex: 1, minWidth: 0, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { position: 'relative' },
  sidebarLabel: { fontSize: 15 },
  bottomLabel: { marginTop: 3, fontSize: 11 },
  compactBottomLabel: { fontSize: 9 },
  selectedLabel: { fontWeight: '700' },
  badge: { position: 'absolute', top: -7, right: -12, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444' },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  sidebarHint: { paddingHorizontal: 10, fontSize: 12, lineHeight: 18 },
});
