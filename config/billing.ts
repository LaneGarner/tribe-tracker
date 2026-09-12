import Constants from 'expo-constants';
import { Platform } from 'react-native';

type BillingExtra = {
  BILLING_MODE?: string;
  REVENUECAT_IOS_API_KEY?: string;
  REVENUECAT_ANDROID_API_KEY?: string;
  REVENUECAT_WEB_API_KEY?: string;
  REVENUECAT_WEB_MONTHLY_PRODUCT_ID?: string;
  REVENUECAT_WEB_ANNUAL_PRODUCT_ID?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as BillingExtra;

export const BILLING_MODE =
  extra.BILLING_MODE || process.env.EXPO_PUBLIC_BILLING_MODE || '';

export function revenueCatApiKeyForPlatform(
  platform: string,
  values: BillingExtra = extra,
  environment: NodeJS.ProcessEnv = process.env
): string {
  if (platform === 'ios') {
    return values.REVENUECAT_IOS_API_KEY
      || environment.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      || '';
  }
  if (platform === 'android') {
    return values.REVENUECAT_ANDROID_API_KEY
      || environment.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
      || '';
  }
  if (platform === 'web') {
    return values.REVENUECAT_WEB_API_KEY
      || environment.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY
      || '';
  }
  return '';
}

export const REVENUECAT_API_KEY = revenueCatApiKeyForPlatform(Platform.OS);

export const REVENUECAT_ENTITLEMENT_ID = 'pro';
export const REVENUECAT_PRODUCT_IDS = {
  monthly: Platform.OS === 'web'
    ? extra.REVENUECAT_WEB_MONTHLY_PRODUCT_ID
      || process.env.EXPO_PUBLIC_REVENUECAT_WEB_MONTHLY_PRODUCT_ID
      || ''
    : 'tribetracker_pro_monthly',
  annual: Platform.OS === 'web'
    ? extra.REVENUECAT_WEB_ANNUAL_PRODUCT_ID
      || process.env.EXPO_PUBLIC_REVENUECAT_WEB_ANNUAL_PRODUCT_ID
      || ''
    : 'tribetracker_pro_annual',
} as const;
