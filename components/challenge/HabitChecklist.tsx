import React, { useContext, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../redux/store';
import * as Crypto from 'expo-crypto';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { AppDispatch } from '../../redux/store';
import { addCheckin, updateHabitCompletion } from '../../redux/slices/checkinsSlice';
import { updateParticipantStats } from '../../redux/slices/participantsSlice';
import { useAuth } from '../../context/AuthContext';
import { Challenge, HabitCheckin, ChallengeParticipant } from '../../types';
import { getToday, isToday, isPast } from '../../utils/dateUtils';

interface HabitChecklistProps {
  challenge: Challenge;
  checkin?: HabitCheckin;
  date?: string;
}

export default function HabitChecklist({
  challenge,
  checkin,
  date,
}: HabitChecklistProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user } = useAuth();

  // Use provided date or default to today
  const checkinDate = date || getToday();
  // Allow editing for today and past days (not future)
  const canEdit = isToday(checkinDate) || isPast(checkinDate);

  // Memoized selectors to prevent unnecessary rerenders
  const selectCheckins = useMemo(
    () =>
      createSelector(
        [(state: RootState) => state.checkins.data],
        checkins =>
          checkins.filter(
            c => c.challengeId === challenge.id && c.userId === user?.id
          )
      ),
    [challenge.id, user?.id]
  );

  const selectParticipant = useMemo(
    () =>
      createSelector(
        [(state: RootState) => state.participants.data],
        participants =>
          participants.find(
            p => p.challengeId === challenge.id && p.userId === user?.id
          )
      ),
    [challenge.id, user?.id]
  );

  const allCheckins = useSelector(selectCheckins);
  const participant = useSelector(selectParticipant);

  // Calculate and update participant stats after checkin changes
  const updateStats = useCallback(
    (updatedCheckins: HabitCheckin[]) => {
      if (!participant) {
        console.warn('[HabitChecklist] No participant found, cannot update stats');
        return;
      }

      // Only count checkins on or after the challenge start date
      const validCheckins = updatedCheckins.filter(
        c => c.checkinDate >= challenge.startDate
      );

      // Calculate total points from valid checkins only
      const totalPoints = validCheckins.reduce(
        (sum, c) => sum + c.habitsCompleted.filter(h => h).length,
        0
      );

      // Calculate days participated (unique checkin dates from valid checkins)
      const daysParticipated = new Set(validCheckins.map(c => c.checkinDate)).size;

      // Calculate current streak from valid checkins
      const sortedDates = [...new Set(validCheckins.map(c => c.checkinDate))].sort().reverse();
      let currentStreak = 0;
      const today = getToday();

      for (let i = 0; i < sortedDates.length; i++) {
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        const expectedDateStr = expectedDate.toISOString().split('T')[0];

        if (sortedDates[i] === expectedDateStr) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Get longest streak (simplified - just use current if it's larger)
      const longestStreak = Math.max(currentStreak, participant.longestStreak || 0);

      // Get last checkin date
      const lastCheckinDate = sortedDates[0] || participant.lastCheckinDate;

      const statsPayload = {
        id: participant.id,
        totalPoints,
        currentStreak,
        longestStreak,
        daysParticipated,
        lastCheckinDate: lastCheckinDate || today,
      };
      console.log('[HabitChecklist] Dispatching updateParticipantStats:', statsPayload);
      dispatch(updateParticipantStats(statsPayload));
    },
    [dispatch, participant, challenge.startDate]
  );

  const handleToggle = (habitIndex: number) => {
    // Only allow editing for today and past days (not future)
    if (!canEdit) return;

    if (checkin) {
      // Update existing checkin
      dispatch(
        updateHabitCompletion({
          checkinId: checkin.id,
          habitIndex,
          completed: !checkin.habitsCompleted[habitIndex],
        })
      );

      // Calculate updated stats with the modified checkin
      const updatedHabits = [...checkin.habitsCompleted];
      updatedHabits[habitIndex] = !updatedHabits[habitIndex];
      const updatedCheckins = allCheckins.map(c =>
        c.id === checkin.id ? { ...c, habitsCompleted: updatedHabits } : c
      );
      updateStats(updatedCheckins);
    } else {
      // Create new checkin
      const habitsCompleted = challenge.habits.map((_, i) => i === habitIndex);
      const newCheckin: HabitCheckin = {
        id: Crypto.randomUUID(),
        challengeId: challenge.id,
        userId: user?.id || 'anonymous',
        userName: user?.email?.split('@')[0] || 'Anonymous',
        checkinDate,
        habitsCompleted,
        pointsEarned: 1,
        allHabitsCompleted: habitsCompleted.every(h => h),
        updatedAt: new Date().toISOString(),
      };
      dispatch(addCheckin(newCheckin));

      // Calculate updated stats with the new checkin
      updateStats([...allCheckins, newCheckin]);
    }
  };

  const completedCount = checkin
    ? checkin.habitsCompleted.filter(h => h).length
    : 0;
  const allCompleted =
    checkin && checkin.habitsCompleted.every(h => h);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Progress header */}
      <View style={styles.header}>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            {completedCount} of {challenge.habits.length} completed
          </Text>
          {allCompleted && (
            <View
              style={[styles.completeBadge, { backgroundColor: colors.success }]}
            >
              <Ionicons name="checkmark" size={12} color="#fff" />
              <Text style={styles.completeText}>All done!</Text>
            </View>
          )}
        </View>
        <Text style={[styles.pointsText, { color: colors.primary }]}>
          +{completedCount} pts
        </Text>
      </View>

      {/* Habits list */}
      {challenge.habits.map((habit, index) => {
        const isCompleted = checkin?.habitsCompleted[index] || false;

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.habitRow,
              { borderBottomColor: colors.border },
              index === challenge.habits.length - 1 && styles.lastRow,
            ]}
            onPress={() => handleToggle(index)}
            activeOpacity={canEdit ? 0.7 : 1}
            disabled={!canEdit}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: isCompleted
                    ? colors.primary
                    : 'transparent',
                  borderColor: isCompleted ? colors.primary : colors.border,
                },
              ]}
            >
              {isCompleted && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <Text
              style={[
                styles.habitText,
                { color: colors.text },
                isCompleted && styles.habitTextCompleted,
              ]}
            >
              {habit}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  completeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitText: {
    flex: 1,
    fontSize: 15,
  },
  habitTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});
