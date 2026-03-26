import React, { createContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { loadThemeMode, saveThemeMode } from '../utils/storage';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextProps {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  colorScheme: 'light' | 'dark';
  /** @deprecated Use setThemePreference instead */
  setThemeMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextProps>({
  themePreference: 'system',
  setThemePreference: () => {},
  colorScheme: 'light',
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const systemColorScheme = useColorScheme();

  const resolvedColorScheme: 'light' | 'dark' =
    themePreference === 'system'
      ? (systemColorScheme ?? 'light')
      : themePreference;

  // Load saved theme preference on app start
  useEffect(() => {
    const loadSavedTheme = async () => {
      const saved = await loadThemeMode();
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        setThemePreference(saved as ThemePreference);
      }
    };
    loadSavedTheme();
  }, []);

  const handleSetThemePreference = (pref: ThemePreference) => {
    setThemePreference(pref);
    saveThemeMode(pref);
  };

  // Backward compat wrapper
  const handleSetThemeMode = (mode: ThemeMode) => {
    handleSetThemePreference(mode);
  };

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        setThemePreference: handleSetThemePreference,
        colorScheme: resolvedColorScheme,
        setThemeMode: handleSetThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Theme colors for use in components
export const colors = {
  light: {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceSecondary: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    tabBar: '#E0E0E0',
    tabBarBorder: '#E5E7EB',
    tabBarInactive: '#374151',
    tabBarActive: '#000000',
  },
  dark: {
    background: '#000000',
    surface: '#18181B',
    surfaceSecondary: '#27272A',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textTertiary: '#71717A',
    border: '#27272A',
    primary: '#60A5FA',
    primaryDark: '#60A5FA',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    tabBar: '#18181B',
    tabBarBorder: '#27272A',
    tabBarInactive: '#FFFFFF',
    tabBarActive: '#FFFFFF',
  },
};

export function getColors(colorScheme: 'light' | 'dark') {
  return colors[colorScheme];
}
