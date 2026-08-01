import Constants from 'expo-constants';
import { Platform } from 'react-native';

type BillingExtra = {
  BILLING_MODE?: string;
  REVENUECAT_IOS_API_KEY?: string;
  REVENUECAT_ANDROID_API_KEY?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as BillingExtra;

export const BILLING_MODE =
  extra.BILLING_MODE || process.env.EXPO_PUBLIC_BILLING_MODE || '';

export const REVENUECAT_API_KEY =
  Platform.OS === 'ios'
    ? extra.REVENUECAT_IOS_API_KEY ||
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ||
      ''
    : extra.REVENUECAT_ANDROID_API_KEY ||
      process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ||
      '';

export const REVENUECAT_ENTITLEMENT_ID = 'pro';
export const REVENUECAT_PRODUCT_IDS = {
  monthly: 'tribetracker_pro_monthly',
  annual: 'tribetracker_pro_annual',
} as const;
