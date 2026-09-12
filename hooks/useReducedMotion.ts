import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export function shouldReduceWebMotion(platform: string, enabled: boolean): boolean {
  return platform === 'web' && enabled;
}

export function useReducedMotion(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    AccessibilityInfo.isReduceMotionEnabled().then(setEnabled);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setEnabled);
    return () => subscription.remove();
  }, []);

  return shouldReduceWebMotion(Platform.OS, enabled);
}
