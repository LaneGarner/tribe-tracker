jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    executionEnvironment: 'standalone',
    expoConfig: { extra: {} },
  },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 'high' },
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date' },
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
}));

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { showDialog } from '../../platform/dialogs';
import {
  evaluateAndScheduleNotifications,
  DEFAULT_NOTIFICATION_SETTINGS,
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
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

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

describe('notification scheduling accuracy', () => {
  const challenge = (overrides = {}) =>
    ({
      id: 'c1',
      name: 'Test',
      creatorId: 'u1',
      startDate: '2026-10-01',
      endDate: '2026-10-07',
      durationDays: 7,
      habits: ['Walk', 'Read'],
      status: 'active',
      isPublic: true,
      participantCount: 1,
      ...overrides,
    }) as any;
  const participant = {
    challengeId: 'c1',
    userId: 'u1',
    longestStreak: 99,
  } as any;
  const run = (
    challenges: any[],
    checkins: any[] = [],
    settings = DEFAULT_NOTIFICATION_SETTINGS
  ) =>
    evaluateAndScheduleNotifications(
      settings,
      challenges,
      checkins,
      [participant],
      'u1'
    );
  const scheduled = () =>
    (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.map(
      ([request]) => request
    );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 4, 9));
    jest.clearAllMocks();
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (
      Notifications.getAllScheduledNotificationsAsync as jest.Mock
    ).mockResolvedValue([]);
  });
  afterEach(() => jest.useRealTimers());

  it('ignores unjoined public challenges and keeps daily copy accurate after partial or full check-ins', async () => {
    await run([challenge({ id: 'public' })]);
    expect(scheduled()).toHaveLength(0);
    for (const habitsCompleted of [
      [true, false],
      [true, true],
    ]) {
      await run(
        [challenge()],
        [
          {
            challengeId: 'c1',
            userId: 'u1',
            checkinDate: '2026-10-04',
            habitsCompleted,
          },
        ]
      );
      const daily = scheduled().find((n) => n.identifier === 'daily-reminder');
      expect(daily.content.body).toContain('Review today');
      expect(daily.content.body).not.toMatch(/\d/);
    }
  });

  it('warns only about the consecutive streak ending yesterday, once today', async () => {
    const checkins = ['2026-10-01', '2026-10-02', '2026-10-03'].map(
      (checkinDate) => ({ challengeId: 'c1', userId: 'u1', checkinDate })
    );
    await run([challenge()], checkins);
    const warning = scheduled().find((n) => n.identifier === 'streak-warning');
    expect(warning.content.body).toContain('3-day streak');
    expect(warning.trigger.type).toBe('date');
    expect(warning.trigger.date.getDate()).toBe(4);
    (Notifications.scheduleNotificationAsync as jest.Mock).mockClear();
    await run([challenge()], [checkins[2]]);
    expect(scheduled().some((n) => n.identifier === 'streak-warning')).toBe(
      false
    );
    await run([challenge({ status: 'completed' })], checkins);
    expect(scheduled().some((n) => n.identifier === 'streak-warning')).toBe(
      false
    );
  });

  it('does not warn after today’s check-in or after the warning time', async () => {
    const checkins = [
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ].map((checkinDate) => ({ challengeId: 'c1', userId: 'u1', checkinDate }));
    await run([challenge()], checkins);
    expect(scheduled().some((n) => n.identifier === 'streak-warning')).toBe(
      false
    );
    jest.setSystemTime(new Date(2026, 9, 4, 22));
    await run([challenge()], checkins.slice(0, 3));
    expect(scheduled().some((n) => n.identifier === 'streak-warning')).toBe(
      false
    );
  });

  it('removes start reminders once active and end reminders when ongoing', async () => {
    (
      Notifications.getAllScheduledNotificationsAsync as jest.Mock
    ).mockResolvedValue([
      { identifier: 'challenge-start-c1' },
      { identifier: 'challenge-end-c1' },
    ]);
    await run([challenge({ isOngoing: true })]);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'challenge-start-c1'
    );
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'challenge-end-c1'
    );
    expect(scheduled().some((n) => n.identifier === 'challenge-end-c1')).toBe(
      false
    );
  });

  it('cancels disabled and no-longer-applicable lifecycle reminders', async () => {
    (
      Notifications.getAllScheduledNotificationsAsync as jest.Mock
    ).mockResolvedValue([
      { identifier: 'challenge-start-c1' },
      { identifier: 'challenge-end-c1' },
      { identifier: 'challenge-end-public' },
    ]);
    await run([challenge()], [], {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      challengeStartEnabled: false,
      challengeEndEnabled: false,
    });
    for (const id of [
      'challenge-start-c1',
      'challenge-end-c1',
      'challenge-end-public',
    ]) {
      expect(
        Notifications.cancelScheduledNotificationAsync
      ).toHaveBeenCalledWith(id);
    }
  });

  it('uses recurring cycle end dates and schedules next starts during gaps', async () => {
    await run([
      challenge({
        startDate: '2026-09-23',
        endDate: '2026-09-29',
        isRecurring: true,
        gapDays: 2,
      }),
    ]);
    expect(
      scheduled()
        .find((n) => n.identifier === 'challenge-end-c1')
        .trigger.date.getDate()
    ).toBe(7);
    (Notifications.scheduleNotificationAsync as jest.Mock).mockClear();
    jest.setSystemTime(new Date(2026, 9, 9, 9));
    await run([
      challenge({
        startDate: '2026-09-23',
        endDate: '2026-09-29',
        isRecurring: true,
        gapDays: 2,
      }),
    ]);
    expect(
      scheduled()
        .find((n) => n.identifier === 'challenge-start-c1')
        .trigger.date.getDate()
    ).toBe(10);
    expect(scheduled().some((n) => n.identifier === 'daily-reminder')).toBe(
      false
    );
  });
});
