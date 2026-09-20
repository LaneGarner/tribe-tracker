import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { API_URL } from '../config/api';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo) return null;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('Missing EAS projectId for push token registration');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

export async function registerAndSavePushToken(): Promise<void> {
  const pushToken = await registerForPushNotifications();
  if (!pushToken) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;
  await savePushTokenToServer(pushToken, session.access_token, API_URL);
}

export async function savePushTokenToServer(
  token: string,
  accessToken: string,
  apiUrl: string
): Promise<void> {
  try {
    await fetch(`${apiUrl}/api/users`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ profile: { expoPushToken: token } }),
    });
  } catch (err) {
    console.warn('Failed to save push token to server:', err);
  }
}
