import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import {
  NotificationSettings,
  Challenge,
  HabitCheckin,
  ChallengeParticipant,
} from '../types';
import {
  getToday,
  subtractDays,
  getChallengeStatus,
  getRecurringCycleInfo,
} from './dateUtils';
import { calculateActiveStreak } from './streakUtils';
import { store } from '../redux/store';
import dayjs from 'dayjs';
import { showDialog } from '../platform/dialogs';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  dailyReminderEnabled: true,
  dailyReminderTime: '20:00',
  streakProtectionEnabled: true,
  streakProtectionTime: '21:00',
  challengeStartEnabled: true,
  challengeEndEnabled: true,
  chatDmEnabled: true,
  chatGroupEnabled: true,
};

// --- Permission Management ---

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  if (isExpoGo) return 'undetermined' as Notifications.PermissionStatus;
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestPermission(): Promise<boolean> {
  if (isExpoGo) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export function openNotificationSettings(): void {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}

// --- Setup ---

export function configureNotificationHandler(): void {
  if (isExpoGo) return;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'chat' && data?.conversationId) {
        const activeConvId = store.getState().chat.activeConversationId;
        if (activeConvId === data.conversationId) {
          return {
            shouldShowBanner: false,
            shouldShowList: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }
      }
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      };
    },
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('habit-reminders', {
      name: 'Habit Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
    Notifications.setNotificationChannelAsync('chat-messages', {
      name: 'Chat Messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

// --- Scheduling Helpers ---

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number);
  return { hour, minute };
}

async function scheduleDailyReminder(time: string): Promise<void> {
  await cancelNotificationById('daily-reminder');

  const { hour, minute } = parseTime(time);
  // Repeating notifications cannot refresh their content while the app is closed.
  const body =
    'Review today’s habits and log anything you still have left. Keep it going!';

  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-reminder',
    content: {
      title: 'Time to Log Your Habits',
      body,
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'habit-reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

async function scheduleStreakWarning(
  time: string,
  streakCount: number
): Promise<void> {
  await cancelNotificationById('streak-warning');

  const { hour, minute } = parseTime(time);
  const date = dayjs().hour(hour).minute(minute).second(0).millisecond(0);
  if (!date.isAfter(dayjs())) return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'streak-warning',
    content: {
      title: 'Streak at Risk!',
      body: `You have a ${streakCount}-day streak on the line. Log your habits before midnight!`,
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'habit-reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: date.toDate(),
    },
  });
}

async function scheduleChallengeStartNotification(
  challengeId: string,
  challengeName: string,
  startDate: string
): Promise<void> {
  const identifier = `challenge-start-${challengeId}`;
  await cancelNotificationById(identifier);

  const dayBefore = dayjs(startDate).subtract(1, 'day');
  const triggerDate = dayBefore.hour(10).minute(0).second(0);

  if (triggerDate.isBefore(dayjs())) return;

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'Challenge Starting Tomorrow',
      body: `"${challengeName}" kicks off tomorrow. Get ready!`,
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'habit-reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate.toDate(),
    },
  });
}

async function scheduleChallengeEndNotification(
  challengeId: string,
  challengeName: string,
  endDate: string
): Promise<void> {
  const identifier = `challenge-end-${challengeId}`;
  await cancelNotificationById(identifier);

  const penultimateDay = dayjs(endDate).subtract(1, 'day');
  const triggerDate = penultimateDay.hour(10).minute(0).second(0);

  if (triggerDate.isBefore(dayjs())) return;

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'Challenge Ending Soon',
      body: `"${challengeName}" ends tomorrow. Finish strong!`,
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'habit-reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate.toDate(),
    },
  });
}

// --- Cancellation ---

async function cancelNotificationById(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllNotifications(): Promise<void> {
  if (isExpoGo) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// --- Orchestrator ---

export async function evaluateAndScheduleNotifications(
  settings: NotificationSettings,
  challenges: Challenge[],
  checkins: HabitCheckin[],
  participants: ChallengeParticipant[],
  userId: string
): Promise<void> {
  if (isExpoGo) return;
  const permissionStatus = await getPermissionStatus();
  if (permissionStatus !== 'granted' || !settings.pushEnabled) {
    await cancelAllNotifications();
    return;
  }

  const today = getToday();
  const yesterday = subtractDays(today, 1);

  const joinedIds = new Set(
    participants.filter((p) => p.userId === userId).map((p) => p.challengeId)
  );
  const joinedChallenges = challenges.filter(
    (c) => joinedIds.has(c.id) && c.status !== 'completed'
  );
  const statusFor = (c: Challenge) =>
    getChallengeStatus(c.startDate, c.endDate || c.startDate, c);
  const activeChallenges = joinedChallenges.filter(
    (c) => statusFor(c) === 'active'
  );
  const upcomingChallenges = joinedChallenges.filter((c) =>
    ['upcoming', 'gap'].includes(statusFor(c))
  );

  // Keep the recurring copy independent of today's progress, which becomes stale tomorrow.
  if (
    settings.dailyReminderEnabled &&
    activeChallenges.some((c) => c.habits.length > 0)
  ) {
    await scheduleDailyReminder(settings.dailyReminderTime);
  } else {
    await cancelNotificationById('daily-reminder');
  }

  // A historical personal best is not the streak currently at risk.
  const activeIds = new Set(activeChallenges.map((c) => c.id));
  const userCheckins = checkins.filter((c) => c.userId === userId);
  const checkedInToday = new Set(
    userCheckins
      .filter((c) => c.checkinDate === today)
      .map((c) => c.challengeId)
  );
  const atRiskStreaks = [...activeIds]
    .filter((id) => !checkedInToday.has(id))
    .map((id) => {
      const challenge = activeChallenges.find((c) => c.id === id)!;
      const cycleStart =
        getRecurringCycleInfo(challenge)?.cycleStartDate || challenge.startDate;
      return calculateActiveStreak(
        userCheckins
          .filter(
            (c) =>
              c.challengeId === id &&
              c.checkinDate >= cycleStart &&
              c.checkinDate <= yesterday
          )
          .map((c) => c.checkinDate),
        yesterday
      );
    })
    .filter((streak) => streak >= 3);
  if (settings.streakProtectionEnabled && atRiskStreaks.length > 0) {
    await scheduleStreakWarning(
      settings.streakProtectionTime,
      Math.max(...atRiskStreaks)
    );
  } else {
    await cancelNotificationById('streak-warning');
  }

  // Challenge start notifications
  if (settings.challengeStartEnabled) {
    for (const challenge of upcomingChallenges) {
      await scheduleChallengeStartNotification(
        challenge.id,
        challenge.name,
        getRecurringCycleInfo(challenge)?.cycleStartDate || challenge.startDate
      );
    }
  }

  // Challenge end notifications
  if (settings.challengeEndEnabled) {
    for (const challenge of activeChallenges) {
      const endDate =
        getRecurringCycleInfo(challenge)?.cycleEndDate || challenge.endDate;
      if (endDate && !challenge.isOngoing) {
        await scheduleChallengeEndNotification(
          challenge.id,
          challenge.name,
          endDate
        );
      }
    }
  }

  // Cancel start/end notifications for challenges that are no longer relevant
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const startIds = new Set(
    settings.challengeStartEnabled ? upcomingChallenges.map((c) => c.id) : []
  );
  const endIds = new Set(
    settings.challengeEndEnabled
      ? activeChallenges
          .filter((c) => !c.isOngoing && (c.endDate || c.isRecurring))
          .map((c) => c.id)
      : []
  );

  for (const notification of scheduled) {
    const id = notification.identifier;
    const startMatch = id.match(/^challenge-start-(.+)$/);
    const endMatch = id.match(/^challenge-end-(.+)$/);

    if (startMatch && !startIds.has(startMatch[1])) {
      await cancelNotificationById(id);
    }
    if (endMatch && !endIds.has(endMatch[1])) {
      await cancelNotificationById(id);
    }
  }
}

// --- Pre-permission explanation ---

export function showPermissionExplanation(onProceed: () => void): void {
  void showDialog({
    title: 'Enable Notifications',
    message:
      'TribeTracker can remind you to log your daily habits, protect your streaks, and let you know when challenges are starting or ending. You can customize exactly which notifications you receive.',
    actions: [
      { key: 'cancel', label: 'Not Now', role: 'cancel' },
      { key: 'enable', label: 'Enable' },
    ],
  }).then((result) => {
    if (result === 'enable') onProceed();
  });
}

// --- Permission Prompt Tracking ---

const NOTIFICATION_PROMPT_KEY = 'tribe_notification_prompt_shown';

export async function hasPromptedPermission(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATION_PROMPT_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markPermissionPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_PROMPT_KEY, 'true');
  } catch {
    // Silent fail
  }
}
