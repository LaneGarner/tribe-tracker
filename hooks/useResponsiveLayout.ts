import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = Math.min(width, height) >= 600;
  const hasTopTabBar =
    isTablet &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
  const topTabContentOffset = hasTopTabBar ? 88 : 0;

  return {
    width,
    height,
    isLandscape: width > height,
    isTablet,
    hasTopTabBar,
    topTabContentOffset,
    insets,
  };
}
