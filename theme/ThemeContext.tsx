import React, { createContext, useEffect, useState } from 'react';
import { loadThemeMode, saveThemeMode } from '../utils/storage';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colorScheme: 'light' | 'dark';
}

export const ThemeContext = createContext<ThemeContextProps>({
  themeMode: 'light',
  setThemeMode: () => {},
  colorScheme: 'light',
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  // Load saved theme mode on app start
  useEffect(() => {
    const loadSavedTheme = async () => {
      const savedTheme = await loadThemeMode();
      // Only use saved theme if it's 'light' or 'dark', otherwise default to 'light'
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeMode(savedTheme as ThemeMode);
      }
    };
    loadSavedTheme();
  }, []);

  // Save theme mode when it changes
  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    saveThemeMode(mode);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode: handleSetThemeMode,
        colorScheme: themeMode,
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
    tabBarInactive: '#4B5563',
  },
  dark: {
    background: '#000000',
    surface: '#18181B',
    surfaceSecondary: '#27272A',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textTertiary: '#71717A',
    border: '#27272A',
    primary: '#3B82F6',
    primaryDark: '#60A5FA',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    tabBar: '#18181B',
    tabBarBorder: '#27272A',
    tabBarInactive: '#A3A3A3',
  },
};

export function getColors(colorScheme: 'light' | 'dark') {
  return colors[colorScheme];
}
