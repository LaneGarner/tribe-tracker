jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    executionEnvironment: 'standalone',
    expoConfig: { extra: {} },
  },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  configureNotificationHandler,
  getPermissionStatus,
  requestPermission,
} from '../../utils/notifications';

describe('native notification startup contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses granted permission without prompting again', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'granted',
    });

    await expect(requestPermission()).resolves.toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('reports the native permission status unchanged', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });

    await expect(getPermissionStatus()).resolves.toBe('denied');
  });

  it('installs the foreground notification handler on startup', () => {
    configureNotificationHandler();

    expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
  });

  it('preserves Android notification channel setup', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    configureNotificationHandler();

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(2);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'habit-reminders',
      expect.objectContaining({ name: 'Habit Reminders' })
    );
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'chat-messages',
      expect.objectContaining({ name: 'Chat Messages' })
    );

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalOS,
    });
  });
});
