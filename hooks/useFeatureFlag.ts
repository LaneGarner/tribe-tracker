import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tribe_feature_flags';

export const FEATURE_FLAGS = {
  CHAT_TAB: 'chatTab',
  CHALLENGE_CALENDAR: 'challengeCalendar',
} as const;

type FlagName = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

// Module-level cache and listeners for cross-component sync
const flagCache = new Map<string, boolean>();
const listeners = new Map<string, Set<(value: boolean) => void>>();
let cacheLoaded = false;

const loadCache = async () => {
  if (cacheLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      for (const [key, value] of Object.entries(parsed)) {
        flagCache.set(key, value);
      }
    }
  } catch {
    // Fallback to defaults
  }
  cacheLoaded = true;
};

const persistFlags = async () => {
  const obj: Record<string, boolean> = {};
  flagCache.forEach((value, key) => {
    obj[key] = value;
  });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
};

const notifyListeners = (flag: string, value: boolean) => {
  listeners.get(flag)?.forEach(cb => cb(value));
};

export function useFeatureFlag(
  flag: FlagName,
  defaultValue = false,
): [boolean, (value: boolean) => void] {
  const [enabled, setEnabledState] = useState<boolean>(
    flagCache.has(flag) ? flagCache.get(flag)! : defaultValue,
  );

  useEffect(() => {
    let mounted = true;

    // Load from storage if not cached yet
    loadCache().then(() => {
      if (mounted) {
        const cached = flagCache.get(flag);
        if (cached !== undefined) {
          setEnabledState(cached);
        }
      }
    });

    // Subscribe to changes from other hook instances
    const callback = (value: boolean) => {
      if (mounted) setEnabledState(value);
    };

    if (!listeners.has(flag)) {
      listeners.set(flag, new Set());
    }
    listeners.get(flag)!.add(callback);

    return () => {
      mounted = false;
      listeners.get(flag)?.delete(callback);
    };
  }, [flag]);

  const setEnabled = useCallback(
    (value: boolean) => {
      flagCache.set(flag, value);
      persistFlags();
      notifyListeners(flag, value);
    },
    [flag],
  );

  return [enabled, setEnabled];
}
