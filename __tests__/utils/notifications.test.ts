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
import { showDialog } from '../../platform/dialogs';
import {
  configureNotificationHandler,
  getPermissionStatus,
  requestPermission,
  showPermissionExplanation,
} from '../../utils/notifications';

jest.mock('../../platform/dialogs', () => ({
  showDialog: jest.fn(),
}));

describe('native notification startup contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (showDialog as jest.Mock).mockResolvedValue(null);
  });

  it('runs notification permission continuation only when Enable is selected', async () => {
    const onProceed = jest.fn();
    (showDialog as jest.Mock).mockResolvedValueOnce('enable');

    showPermissionExplanation(onProceed);
    await Promise.resolve();

    expect(showDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Enable Notifications',
        actions: [
          { key: 'cancel', label: 'Not Now', role: 'cancel' },
          { key: 'enable', label: 'Enable' },
        ],
      })
    );
    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it('does not continue notification permission when dismissed', async () => {
    const onProceed = jest.fn();

    showPermissionExplanation(onProceed);
    await Promise.resolve();

    expect(onProceed).not.toHaveBeenCalled();
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
