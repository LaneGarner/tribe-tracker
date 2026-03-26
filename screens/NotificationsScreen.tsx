import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState, AppDispatch } from '../redux/store';
import { updateProfile } from '../redux/slices/profileSlice';
import { NotificationSettings } from '../types';
import Toggle from '../components/Toggle';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getPermissionStatus,
  requestPermission,
  openNotificationSettings,
  showPermissionExplanation,
  cancelAllNotifications,
} from '../utils/notifications';

function timeStringToDate(time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatTimeForDisplay(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export default function NotificationsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const profile = useSelector((state: RootState) => state.profile.data);
  const settings: NotificationSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(profile?.notificationSettings ?? {}),
  };

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'reminder' | 'streak' | null>(null);
  const [tempPickerDate, setTempPickerDate] = useState(new Date());

  useEffect(() => {
    getPermissionStatus().then(status => {
      setPermissionDenied(status === 'denied');
    });
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<NotificationSettings>) => {
      const updated = { ...settings, ...partial };
      dispatch(
        updateProfile({
          notificationSettings: updated,
          pushNotifications: updated.pushEnabled,
        })
      );
    },
    [settings, dispatch]
  );

  const handleMasterToggle = async () => {
    if (!settings.pushEnabled) {
      // Enabling -- check permission first
      const status = await getPermissionStatus();
      if (status === 'denied') {
        setPermissionDenied(true);
        return;
      }
      if (status !== 'granted') {
        showPermissionExplanation(async () => {
          const granted = await requestPermission();
          if (granted) {
            updateSettings({ pushEnabled: true });
          } else {
            setPermissionDenied(true);
          }
        });
        return;
      }
      updateSettings({ pushEnabled: true });
    } else {
      // Disabling -- cancel all
      await cancelAllNotifications();
      updateSettings({ pushEnabled: false });
    }
  };

  const handleTimeChange = (field: 'dailyReminderTime' | 'streakProtectionTime') => {
    return (_event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowTimePicker(null);
        if (_event.type === 'dismissed' || !selectedDate) return;
      }

      if (!selectedDate) return;

      if (Platform.OS === 'android') {
        applyTimeSelection(field, selectedDate);
      } else {
        setTempPickerDate(selectedDate);
      }
    };
  };

  const applyTimeSelection = (
    field: 'dailyReminderTime' | 'streakProtectionTime',
    date: Date
  ) => {
    let newTime = dateToTimeString(date);

    if (field === 'streakProtectionTime') {
      const reminderMinutes = timeToMinutes(settings.dailyReminderTime);
      const streakMinutes = timeToMinutes(newTime);
      if (streakMinutes < reminderMinutes + 30) {
        const adjusted = reminderMinutes + 30;
        const adjH = Math.floor(adjusted / 60) % 24;
        const adjM = adjusted % 60;
        newTime = `${adjH.toString().padStart(2, '0')}:${adjM.toString().padStart(2, '0')}`;
      }
    }

    if (field === 'dailyReminderTime') {
      const newReminderMinutes = timeToMinutes(newTime);
      const streakMinutes = timeToMinutes(settings.streakProtectionTime);
      if (streakMinutes < newReminderMinutes + 30) {
        const adjusted = newReminderMinutes + 30;
        const adjH = Math.floor(adjusted / 60) % 24;
        const adjM = adjusted % 60;
        const adjustedStreakTime = `${adjH.toString().padStart(2, '0')}:${adjM.toString().padStart(2, '0')}`;
        updateSettings({ [field]: newTime, streakProtectionTime: adjustedStreakTime });
        return;
      }
    }

    updateSettings({ [field]: newTime });
  };

  const confirmIOSPicker = () => {
    if (showTimePicker === 'reminder') {
      applyTimeSelection('dailyReminderTime', tempPickerDate);
    } else if (showTimePicker === 'streak') {
      applyTimeSelection('streakProtectionTime', tempPickerDate);
    }
    setShowTimePicker(null);
  };

  const openTimePicker = (type: 'reminder' | 'streak') => {
    const time = type === 'reminder' ? settings.dailyReminderTime : settings.streakProtectionTime;
    setTempPickerDate(timeStringToDate(time));
    setShowTimePicker(type);
  };

  const pushDisabled = !settings.pushEnabled;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Permission Denied Banner */}
        {permissionDenied && (
          <Pressable
            onPress={openNotificationSettings}
            style={[styles.banner, { backgroundColor: colors.warning + '20' }]}
            accessibilityRole="button"
            accessibilityLabel="Notifications are disabled in system settings. Tap to open settings."
          >
            <Ionicons name="warning-outline" size={20} color={colors.warning} />
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>
                Notifications Disabled
              </Text>
              <Text style={[styles.bannerDescription, { color: colors.textSecondary }]}>
                Enable notifications in your device settings to receive reminders.
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
          </Pressable>
        )}

        {/* Push Notifications Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Push Notifications
            </Text>
          </View>

          {/* Master Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Push Notifications
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Enable all push notification reminders
              </Text>
            </View>
            <Toggle
              value={settings.pushEnabled}
              onValueChange={handleMasterToggle}
              accessibilityLabel="Toggle push notifications"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Daily Reminder */}
          <View style={[styles.settingRow, pushDisabled && styles.dimmed]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Daily Reminder
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Remind me to log my habits
              </Text>
            </View>
            <Toggle
              value={settings.dailyReminderEnabled}
              onValueChange={v => updateSettings({ dailyReminderEnabled: v })}
              disabled={pushDisabled}
              accessibilityLabel="Toggle daily reminder"
            />
          </View>

          {settings.dailyReminderEnabled && !pushDisabled && (
            <Pressable
              onPress={() => openTimePicker('reminder')}
              style={[styles.timeRow, { backgroundColor: colors.surfaceSecondary }]}
              accessibilityRole="button"
              accessibilityLabel={`Daily reminder time: ${formatTimeForDisplay(settings.dailyReminderTime)}. Tap to change.`}
            >
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                Reminder Time
              </Text>
              <Text style={[styles.timeValue, { color: colors.primary }]}>
                {formatTimeForDisplay(settings.dailyReminderTime)}
              </Text>
            </Pressable>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Streak Protection */}
          <View style={[styles.settingRow, pushDisabled && styles.dimmed]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Streak Protection
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Extra warning when a 3+ day streak is at risk
              </Text>
            </View>
            <Toggle
              value={settings.streakProtectionEnabled}
              onValueChange={v => updateSettings({ streakProtectionEnabled: v })}
              disabled={pushDisabled}
              variant="warning"
              accessibilityLabel="Toggle streak protection warning"
            />
          </View>

          {settings.streakProtectionEnabled && !pushDisabled && (
            <Pressable
              onPress={() => openTimePicker('streak')}
              style={[styles.timeRow, { backgroundColor: colors.surfaceSecondary }]}
              accessibilityRole="button"
              accessibilityLabel={`Streak warning time: ${formatTimeForDisplay(settings.streakProtectionTime)}. Tap to change.`}
            >
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                Warning Time
              </Text>
              <Text style={[styles.timeValue, { color: colors.warning }]}>
                {formatTimeForDisplay(settings.streakProtectionTime)}
              </Text>
            </Pressable>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Challenge Starting Tomorrow */}
          <View style={[styles.settingRow, pushDisabled && styles.dimmed]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Challenge Starting Tomorrow
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Get notified the day before a challenge begins
              </Text>
            </View>
            <Toggle
              value={settings.challengeStartEnabled}
              onValueChange={v => updateSettings({ challengeStartEnabled: v })}
              disabled={pushDisabled}
              accessibilityLabel="Toggle challenge starting notification"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Challenge Ending Soon */}
          <View style={[styles.settingRow, pushDisabled && styles.dimmed]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Challenge Ending Soon
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Get notified the day before a challenge ends
              </Text>
            </View>
            <Toggle
              value={settings.challengeEndEnabled}
              onValueChange={v => updateSettings({ challengeEndEnabled: v })}
              disabled={pushDisabled}
              accessibilityLabel="Toggle challenge ending notification"
            />
          </View>
        </View>

        {/* Chat Notifications Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Chat Notifications
            </Text>
          </View>

          <View style={[styles.settingRow, pushDisabled && styles.dimmed]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Direct Messages
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Get notified when someone sends you a DM
              </Text>
            </View>
            <Toggle
              value={settings.chatDmEnabled}
              onValueChange={v => updateSettings({ chatDmEnabled: v })}
              disabled={pushDisabled}
              accessibilityLabel="Toggle direct message notifications"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={[styles.settingRow, pushDisabled && styles.dimmed]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Group Messages
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Get notified for new messages in challenge group chats
              </Text>
            </View>
            <Toggle
              value={settings.chatGroupEnabled}
              onValueChange={v => updateSettings({ chatGroupEnabled: v })}
              disabled={pushDisabled}
              accessibilityLabel="Toggle group message notifications"
            />
          </View>
        </View>

        {/* Email Notifications Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Email Notifications
            </Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Email Notifications
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Receive email updates
              </Text>
            </View>
            <Toggle
              value={profile?.emailNotifications ?? false}
              onValueChange={() =>
                dispatch(updateProfile({ emailNotifications: !profile?.emailNotifications }))
              }
              accessibilityLabel="Toggle email notifications"
            />
          </View>
        </View>
      </ScrollView>

      {/* iOS Time Picker Modal */}
      {Platform.OS === 'ios' && showTimePicker !== null && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Pressable
                  onPress={() => setShowTimePicker(null)}
                  hitSlop={14}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel time selection"
                >
                  <Text style={[styles.modalButton, { color: colors.textSecondary }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {showTimePicker === 'reminder' ? 'Reminder Time' : 'Warning Time'}
                </Text>
                <Pressable
                  onPress={confirmIOSPicker}
                  hitSlop={14}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm time selection"
                >
                  <Text style={[styles.modalButton, { color: colors.primary }]}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempPickerDate}
                mode="time"
                display="spinner"
                onChange={(_e, date) => {
                  if (date) setTempPickerDate(date);
                }}
                minuteInterval={5}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Time Picker (renders inline) */}
      {Platform.OS === 'android' && showTimePicker !== null && (
        <DateTimePicker
          value={tempPickerDate}
          mode="time"
          display="default"
          onChange={handleTimeChange(
            showTimePicker === 'reminder' ? 'dailyReminderTime' : 'streakProtectionTime'
          )}
          minuteInterval={5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  bannerDescription: {
    fontSize: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  dimmed: {
    opacity: 0.4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 4,
    gap: 8,
  },
  timeLabel: {
    flex: 1,
    fontSize: 14,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButton: {
    fontSize: 16,
    fontWeight: '500',
  },
});
