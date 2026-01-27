import 'dotenv/config';

export default {
  expo: {
    name: 'Tribe Tracker',
    slug: 'tribe-tracker',
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
      eas: {
        projectId: 'bad1c5ce-dff4-4872-ab46-8f3eb486ed1f',
      },
    },
    plugins: ['expo-font'],
  },
};
