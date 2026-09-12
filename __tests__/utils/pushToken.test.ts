jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    executionEnvironment: 'standalone',
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
  },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));

import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';
import {
  registerAndSavePushToken,
  registerForPushNotifications,
  savePushTokenToServer,
} from '../../utils/pushToken';

describe('push token registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  it('does not request a token when notification permission is absent', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });

    await expect(registerForPushNotifications()).resolves.toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('does not call the backend without an authenticated session', async () => {
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({
      data: 'ExponentPushToken[test]',
    });

    await registerAndSavePushToken();

    expect(supabase.auth.getSession).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('uses the configured EAS project when requesting a token', async () => {
    await expect(registerForPushNotifications()).resolves.toBe(
      'ExponentPushToken[test]'
    );
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: 'test-project-id',
    });
  });

  it('sends the existing authenticated backend contract', async () => {
    await savePushTokenToServer(
      'ExponentPushToken[device]',
      'access-token',
      'https://api.example'
    );

    expect(global.fetch).toHaveBeenCalledWith('https://api.example/api/users', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer access-token',
      },
      body: JSON.stringify({
        profile: { expoPushToken: 'ExponentPushToken[device]' },
      }),
    });
  });
});
