import 'dotenv/config';

export default {
  expo: {
    name: 'TribeTracker',
    slug: 'tribe-tracker',
    scheme: 'tribetracker',
    owner: 'lanegarner',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
      dark: {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#000000',
      },
    },
    ios: {
      bundleIdentifier: 'com.lanegarner.tribetracker',
      supportsTablet: true,
      requireFullScreen: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.lanegarner.tribetracker',
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      edgeToEdgeEnabled: true,
      screenOrientation: 'portrait',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      API_URL: process.env.EXPO_PUBLIC_API_URL,
      BILLING_MODE: process.env.EXPO_PUBLIC_BILLING_MODE,
      REVENUECAT_IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      REVENUECAT_ANDROID_API_KEY:
        process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
      TERMS_URL: process.env.EXPO_PUBLIC_TERMS_URL,
      PRIVACY_URL: process.env.EXPO_PUBLIC_PRIVACY_URL,
      SUPPORT_URL: process.env.EXPO_PUBLIC_SUPPORT_URL,
      COMMUNITY_GUIDELINES_URL:
        process.env.EXPO_PUBLIC_COMMUNITY_GUIDELINES_URL,
      eas: {
        projectId: 'bad1c5ce-dff4-4872-ab46-8f3eb486ed1f',
      },
    },
    plugins: [
      'expo-font',
      'react-native-bottom-tabs',
      '@react-native-community/datetimepicker',
      [
        'expo-image-picker',
        {
          cameraPermission: 'TribeTracker needs camera access so you can take a profile photo.',
          photosPermission: 'TribeTracker needs photo library access so you can choose a profile photo.',
          microphonePermission: false,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#3B82F6',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: '16.1',
          },
        },
      ],
    ],
  },
};
