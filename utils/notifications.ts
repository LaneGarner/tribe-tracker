import * as Notifications from 'expo-notifications';
import { Platform, Linking, Alert } from 'react-native';
import { NotificationSettings, Challenge, HabitCheckin, ChallengeParticipant } from '../types';
import { getToday, subtractDays } from './dateUtils';
import dayjs from 'dayjs';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  dailyReminderEnabled: true,
  dailyReminderTime: '20:00',
  streakProtectionEnabled: true,
  streakProtectionTime: '21:00',
  challengeStartEnabled: true,
  challengeEndEnabled: true,
};

// --- Permission Management ---

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestPermission(): Promise<boolean> {
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
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('habit-reminders', {
      name: 'Habit Reminders',
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

async function scheduleDailyReminder(time: string, challengeCount: number): Promise<void> {
  await cancelNotificationById('daily-reminder');

  const { hour, minute } = parseTime(time);
  const body =
    challengeCount === 1
      ? 'You have 1 challenge to log today. Keep it going!'
      : `You have ${challengeCount} challenges to log today. Keep it going!`;

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

async function scheduleStreakWarning(time: string, streakCount: number): Promise<void> {
  await cancelNotificationById('streak-warning');

  const { hour, minute } = parseTime(time);

  await Notifications.scheduleNotificationAsync({
    identifier: 'streak-warning',
    content: {
      title: 'Streak at Risk!',
      body: `You have a ${streakCount}+ day streak on the line. Log your habits before midnight!`,
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
  const permissionStatus = await getPermissionStatus();
  if (permissionStatus !== 'granted' || !settings.pushEnabled) {
    await cancelAllNotifications();
    return;
  }

  const today = getToday();
  const yesterday = subtractDays(today, 1);

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const upcomingChallenges = challenges.filter(c => c.status === 'upcoming');

  // Check which active challenges have been checked in today
  const todayCheckins = checkins.filter(c => c.checkinDate === today && c.userId === userId);
  const checkedInChallengeIds = new Set(todayCheckins.map(c => c.challengeId));
  const uncheckedActiveChallenges = activeChallenges.filter(c => !checkedInChallengeIds.has(c.id));

  // Daily reminder
  if (settings.dailyReminderEnabled && uncheckedActiveChallenges.length > 0) {
    await scheduleDailyReminder(settings.dailyReminderTime, uncheckedActiveChallenges.length);
  } else {
    await cancelNotificationById('daily-reminder');
  }

  // Streak protection warning
  if (settings.streakProtectionEnabled) {
    // Find participants for this user with at-risk streaks
    const atRiskParticipants = participants.filter(p => {
      if (p.userId !== userId) return false;
      if (checkedInChallengeIds.has(p.challengeId)) return false;
      // Streak is at risk if they checked in yesterday and have a streak >= 3
      return p.lastCheckinDate === yesterday && p.longestStreak >= 3;
    });

    if (atRiskParticipants.length > 0) {
      const maxStreak = Math.max(...atRiskParticipants.map(p => p.longestStreak));
      await scheduleStreakWarning(settings.streakProtectionTime, maxStreak);
    } else {
      await cancelNotificationById('streak-warning');
    }
  } else {
    await cancelNotificationById('streak-warning');
  }

  // Challenge start notifications
  if (settings.challengeStartEnabled) {
    for (const challenge of upcomingChallenges) {
      await scheduleChallengeStartNotification(challenge.id, challenge.name, challenge.startDate);
    }
  }

  // Challenge end notifications
  if (settings.challengeEndEnabled) {
    for (const challenge of activeChallenges) {
      if (challenge.endDate) {
        await scheduleChallengeEndNotification(challenge.id, challenge.name, challenge.endDate);
      }
    }
  }

  // Cancel start/end notifications for challenges that are no longer relevant
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const relevantChallengeIds = new Set([
    ...upcomingChallenges.map(c => c.id),
    ...activeChallenges.map(c => c.id),
  ]);

  for (const notification of scheduled) {
    const id = notification.identifier;
    const startMatch = id.match(/^challenge-start-(.+)$/);
    const endMatch = id.match(/^challenge-end-(.+)$/);

    if (startMatch && !relevantChallengeIds.has(startMatch[1])) {
      await cancelNotificationById(id);
    }
    if (endMatch && !relevantChallengeIds.has(endMatch[1])) {
      await cancelNotificationById(id);
    }
  }
}

// --- Pre-permission explanation ---

export function showPermissionExplanation(onProceed: () => void): void {
  Alert.alert(
    'Enable Notifications',
    'Tribe Tracker can remind you to log your daily habits, protect your streaks, and let you know when challenges are starting or ending. You can customize exactly which notifications you receive.',
    [
      { text: 'Not Now', style: 'cancel' },
      { text: 'Enable', onPress: onProceed },
    ]
  );
}
