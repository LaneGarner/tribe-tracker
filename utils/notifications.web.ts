import type { Challenge, ChallengeParticipant, HabitCheckin, NotificationSettings } from '../types';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

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

export async function getPermissionStatus(): Promise<NotificationPermissionStatus> {
  return 'undetermined';
}
export async function requestPermission(): Promise<boolean> { return false; }
export function openNotificationSettings(): void {}
export function configureNotificationHandler(): void {}
export async function cancelAllNotifications(): Promise<void> {}
export async function evaluateAndScheduleNotifications(
  _settings: NotificationSettings,
  _challenges: Challenge[],
  _checkins: HabitCheckin[],
  _participants: ChallengeParticipant[],
  _userId: string
): Promise<void> {}
export function showPermissionExplanation(_onProceed: () => void): void {}
export async function hasPromptedPermission(): Promise<boolean> { return false; }
export async function markPermissionPrompted(): Promise<void> {}
