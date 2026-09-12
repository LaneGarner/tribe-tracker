import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  pageGutterForWidth,
  responsiveSizeForWidth,
  RESPONSIVE_BREAKPOINTS,
} from '../constants/responsive';

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const size = responsiveSizeForWidth(width);
  const isTablet = Math.min(width, height) >= RESPONSIVE_BREAKPOINTS.compact;
  const hasTopTabBar =
    isTablet &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
  const topTabContentOffset = hasTopTabBar ? 88 : 0;

  return {
    width,
    height,
    insets,
    isLandscape: width > height,
    isTablet,
    hasTopTabBar,
    topTabContentOffset,
    size,
    gutter: pageGutterForWidth(width),
    isCompact: size === 'compact',
    isMedium: size === 'medium',
    isWide: size === 'wide',
    breakpoints: RESPONSIVE_BREAKPOINTS,
  } as const;
}
