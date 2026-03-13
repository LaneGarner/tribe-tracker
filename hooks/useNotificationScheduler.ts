import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'react-native';
import { RootState } from '../redux/store';
import { evaluateAndScheduleNotifications, DEFAULT_NOTIFICATION_SETTINGS } from '../utils/notifications';

export default function useNotificationScheduler(): void {
  const profile = useSelector((state: RootState) => state.profile.data);
  const challenges = useSelector((state: RootState) => state.challenges.data);
  const checkins = useSelector((state: RootState) => state.checkins.data);
  const participants = useSelector((state: RootState) => state.participants.data);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNotifications = () => {
    if (!profile?.id) return;

    const settings = profile.notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS;

    evaluateAndScheduleNotifications(
      settings,
      challenges,
      checkins,
      participants,
      profile.id
    );
  };

  // Re-evaluate when relevant state changes
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(scheduleNotifications, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [
    profile?.notificationSettings,
    profile?.pushNotifications,
    challenges,
    checkins,
    participants,
  ]);

  // Re-evaluate when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        scheduleNotifications();
      }
    });
    return () => subscription.remove();
  }, [profile, challenges, checkins, participants]);
}
