import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Kanit_700Bold } from '@expo-google-fonts/kanit';
import React, { useContext, useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useDispatch } from 'react-redux';
import RootNavigator from './navigation/RootNavigator';
import {
  loadChallengesFromStorage,
  fetchChallengesFromServer,
} from './redux/slices/challengesSlice';
import {
  loadCheckinsFromStorage,
  fetchCheckinsFromServer,
} from './redux/slices/checkinsSlice';
import {
  loadParticipantsFromStorage,
  fetchParticipantsFromServer,
} from './redux/slices/participantsSlice';
import {
  loadProfileFromStorage,
  fetchProfileFromServer,
} from './redux/slices/profileSlice';
import {
  loadBadgesFromStorage,
  fetchBadgesFromServer,
} from './redux/slices/badgesSlice';
import { AppDispatch, store } from './redux/store';
import { ThemeContext, ThemeProvider, getColors } from './theme/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isBackendConfigured } from './config/api';
import { RootStackParamList } from './types';
import { setPendingInviteCode, consumePendingInviteCode, setPendingChallengeId, consumePendingChallengeId } from './utils/pendingInvite';
import { configureNotificationHandler } from './utils/notifications';
import useNotificationScheduler from './hooks/useNotificationScheduler';
import { registerAndSavePushToken } from './utils/pushToken';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

const linking = {
  prefixes: [Linking.createURL('/'), 'https://tribe-tracker-backend.vercel.app'],
  config: {
    screens: {
      CreateChallenge: 'invite/:inviteCode',
      ChallengeDetail: 'challenge/:challengeId',
    },
  },
};

function AppContent() {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const { isLoading: authLoading, isConfigured, user, session } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const prevUserRef = useRef<typeof user>(null);

  // Configure notification handler on mount
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  // Schedule notifications based on state
  useNotificationScheduler();

  // Load data from storage on app start
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        dispatch(loadChallengesFromStorage()),
        dispatch(loadCheckinsFromStorage()),
        dispatch(loadParticipantsFromStorage()),
        dispatch(loadProfileFromStorage()),
        dispatch(loadBadgesFromStorage()),
      ]);
      setIsInitializing(false);
    };
    loadData();
  }, [dispatch]);

  // Fetch data from server when user logs in
  useEffect(() => {
    const wasLoggedOut = prevUserRef.current === null;
    const isNowLoggedIn = user !== null;
    prevUserRef.current = user;

    if (wasLoggedOut && isNowLoggedIn && session?.access_token && isBackendConfigured()) {
      const token = session.access_token;
      dispatch(fetchChallengesFromServer(token));
      dispatch(fetchParticipantsFromServer(token));
      dispatch(fetchCheckinsFromServer(token));
      dispatch(fetchProfileFromServer(token));
      dispatch(fetchBadgesFromServer(token));

      // Register push token after login (only if permission already granted)
      registerAndSavePushToken();
    }
  }, [user, session, dispatch]);

  // Handle pending deep links after login
  useEffect(() => {
    if (user && !isInitializing && navigationRef.isReady()) {
      const code = consumePendingInviteCode();
      if (code) {
        setTimeout(() => {
          navigationRef.navigate('CreateChallenge', { mode: 'join', inviteCode: code });
        }, 500);
        return;
      }
      const challengeId = consumePendingChallengeId();
      if (challengeId) {
        setTimeout(() => {
          navigationRef.navigate('ChallengeDetail', { challengeId });
        }, 500);
      }
    }
  }, [user, isInitializing]);

  // Store deep link data if user is not authenticated
  useEffect(() => {
    const storePendingDeepLink = (url: string) => {
      if (user) return;
      const inviteMatch = url.match(/invite\/([A-Za-z0-9]+)/);
      if (inviteMatch) {
        setPendingInviteCode(inviteMatch[1]);
        return;
      }
      const challengeMatch = url.match(/challenge\/([A-Za-z0-9-]+)/);
      if (challengeMatch) {
        setPendingChallengeId(challengeMatch[1]);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => storePendingDeepLink(url));

    Linking.getInitialURL().then(url => {
      if (url) storePendingDeepLink(url);
    });

    return () => subscription.remove();
  }, [user]);

  // Lock orientation to portrait
  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
    lockOrientation();
  }, []);

  // Show loading while checking auth (only if backend is configured)
  if ((authLoading && isConfigured) || isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colorScheme === 'dark' ? '#000' : '#F9FAFB',
        }}
      >
        <ActivityIndicator
          size="large"
          color={colorScheme === 'dark' ? '#60A5FA' : '#3B82F6'}
        />
        <Text
          style={{
            marginTop: 16,
            fontSize: 16,
            color: colorScheme === 'dark' ? '#9CA3AF' : '#6B7280',
          }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  const colors = getColors(colorScheme);
  const navTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.background,
      border: colors.border,
      text: colors.text,
      primary: colors.primary,
    },
  };

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef} linking={linking} theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Kanit_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
