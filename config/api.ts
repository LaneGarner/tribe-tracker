import Constants from 'expo-constants';

// Backend API configuration
// In dev mode, use local server; in prod, use deployed server
const DEV_API_URL = 'http://localhost:3000';
const PROD_API_URL =
  (Constants.expoConfig?.extra?.API_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  '';

// For physical device testing, use PROD_API_URL since localhost won't work
// For simulator testing, you can use DEV_API_URL
export const API_URL = PROD_API_URL || DEV_API_URL;

// Supabase configuration
export const SUPABASE_URL =
  (Constants.expoConfig?.extra?.SUPABASE_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
  '';

export const SUPABASE_ANON_KEY =
  (Constants.expoConfig?.extra?.SUPABASE_ANON_KEY as string | undefined) ||
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  '';

// Check if backend is configured
export function isBackendConfigured(): boolean {
  return Boolean(API_URL && SUPABASE_URL && SUPABASE_ANON_KEY);
}
