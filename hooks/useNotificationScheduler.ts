import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'react-native';
import { RootState } from '../redux/store';
import {
  evaluateAndScheduleNotifications,
  DEFAULT_NOTIFICATION_SETTINGS,
  getPermissionStatus,
  requestPermission,
  showPermissionExplanation,
  hasPromptedPermission,
  markPermissionPrompted,
} from '../utils/notifications';
import { registerAndSavePushToken } from '../utils/pushToken';

export default function useNotificationScheduler(): void {
  const profile = useSelector((state: RootState) => state.profile.data);
  const challenges = useSelector((state: RootState) => state.challenges.data);
  const checkins = useSelector((state: RootState) => state.checkins.data);
  const participants = useSelector((state: RootState) => state.participants.data);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPromptedRef = useRef(false);

  const scheduleNotifications = useCallback(() => {
    if (!profile?.id) return;

    const settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...(profile.notificationSettings ?? {}) };

    evaluateAndScheduleNotifications(
      settings,
      challenges,
      checkins,
      participants,
      profile.id
    );
  }, [profile, challenges, checkins, participants]);

  // Re-evaluate when relevant state changes
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(scheduleNotifications, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [scheduleNotifications]);

  // Re-evaluate when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        scheduleNotifications();
      }
    });
    return () => subscription.remove();
  }, [scheduleNotifications]);

  // One-time permission prompt when user has active challenges
  useEffect(() => {
    if (!profile?.id) return;

    const activeChallenges = challenges.filter(c => c.status === 'active');
    if (activeChallenges.length === 0) return;

    const promptIfNeeded = async () => {
      if (hasPromptedRef.current) return;
      hasPromptedRef.current = true;

      const alreadyPrompted = await hasPromptedPermission();
      if (alreadyPrompted) return;

      const status = await getPermissionStatus();
      if (status === 'granted' || status === 'denied') {
        await markPermissionPrompted();
        return;
      }

      showPermissionExplanation(async () => {
        const granted = await requestPermission();
        await markPermissionPrompted();
        if (granted) {
          scheduleNotifications();
          registerAndSavePushToken();
        }
      });
    };

    promptIfNeeded();
  }, [profile?.id, challenges, scheduleNotifications]);
}
