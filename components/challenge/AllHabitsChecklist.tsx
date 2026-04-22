import React, { useContext, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import * as Crypto from 'expo-crypto';
import { RootState, AppDispatch } from '../../redux/store';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import {
  addCheckin,
  updateHabitCompletion,
  deleteCheckin,
} from '../../redux/slices/checkinsSlice';
import { updateParticipantStats } from '../../redux/slices/participantsSlice';
import { useAuth } from '../../context/AuthContext';
import { Challenge, HabitCheckin } from '../../types';
import { getToday, isToday, isPast, getCycleForDate } from '../../utils/dateUtils';
import { calculateActiveStreak } from '../../utils/streakUtils';

interface AllHabitsChecklistProps {
  challenges: Challenge[];
  date?: string;
  hasBackgroundImage?: boolean;
}

interface HabitEntry {
  challenge: Challenge;
  habitIndex: number;
}

interface DedupRow {
  displayText: string;
  normalizedText: string;
  entries: HabitEntry[];
}

export default function AllHabitsChecklist({
  challenges,
  date,
  hasBackgroundImage,
}: AllHabitsChecklistProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user } = useAuth();

  const checkinDate = date || getToday();
  const canEdit = isToday(checkinDate) || isPast(checkinDate);

  const glassStyle: ViewStyle | undefined = hasBackgroundImage
    ? {
        backgroundColor:
          colorScheme === 'dark'
            ? 'rgba(24, 24, 27, 0.72)'
            : 'rgba(255, 255, 255, 0.88)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor:
          colorScheme === 'dark'
            ? 'rgba(255, 255, 255, 0.12)'
            : 'rgba(255, 255, 255, 0.25)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.3,
        shadowRadius: 4,
        elevation: 2,
      }
    : undefined;

  const challengeIds = useMemo(
    () => challenges.map(c => c.id),
    [challenges]
  );

  // Select all of the user's checkins across the target challenges for this date.
  const selectRelevantCheckins = useMemo(
    () =>
      createSelector(
        [(state: RootState) => state.checkins.data],
        checkinsData =>
          checkinsData.filter(
            c =>
              c.userId === user?.id &&
              c.checkinDate === checkinDate &&
              challengeIds.includes(c.challengeId)
          )
      ),
    [user?.id, checkinDate, challengeIds]
  );

  // All user checkins (needed for participant stats recomputation)
  const selectAllUserCheckins = useMemo(
    () =>
      createSelector(
        [(state: RootState) => state.checkins.data],
        checkinsData => checkinsData.filter(c => c.userId === user?.id)
      ),
    [user?.id]
  );

  const selectRelevantParticipants = useMemo(
    () =>
      createSelector(
        [(state: RootState) => state.participants.data],
        participants =>
          participants.filter(
            p => p.userId === user?.id && challengeIds.includes(p.challengeId)
          )
      ),
    [user?.id, challengeIds]
  );

  const relevantCheckins = useSelector(selectRelevantCheckins);
  const allUserCheckins = useSelector(selectAllUserCheckins);
  const relevantParticipants = useSelector(selectRelevantParticipants);

  // Build deduplicated habit rows
  const dedupRows: DedupRow[] = useMemo(() => {
    const map = new Map<string, DedupRow>();
    challenges.forEach(challenge => {
      (challenge.habits || []).forEach((habit, index) => {
        const normalized = habit.trim().toLowerCase();
        if (!normalized) return;
        const existing = map.get(normalized);
        if (existing) {
          existing.entries.push({ challenge, habitIndex: index });
        } else {
          map.set(normalized, {
            displayText: habit.trim(),
            normalizedText: normalized,
            entries: [{ challenge, habitIndex: index }],
          });
        }
      });
    });
    return Array.from(map.values());
  }, [challenges]);

  // Determine checked state for each row: true iff every entry is currently checked
  const rowCompletion = useMemo(() => {
    return dedupRows.map(row => {
      const results = row.entries.map(entry => {
        const checkin = relevantCheckins.find(
          c => c.challengeId === entry.challenge.id
        );
        return !!checkin?.habitsCompleted?.[entry.habitIndex];
      });
      const allChecked = results.length > 0 && results.every(r => r);
      const anyChecked = results.some(r => r);
      return { allChecked, anyChecked };
    });
  }, [dedupRows, relevantCheckins]);

  const totalEntries = dedupRows.length;
  const completedEntries = rowCompletion.filter(r => r.allChecked).length;

  // Update stats for a single challenge based on an updated checkins array
  const updateStatsForChallenge = useCallback(
    (challenge: Challenge, updatedAllUserCheckins: HabitCheckin[]) => {
      const participant = relevantParticipants.find(
        p => p.challengeId === challenge.id
      );
      if (!participant) return;

      const challengeCheckins = updatedAllUserCheckins.filter(
        c => c.challengeId === challenge.id && c.checkinDate >= challenge.startDate
      );

      const totalPoints = challengeCheckins.reduce(
        (sum, c) => sum + c.habitsCompleted.filter(h => h).length,
        0
      );
      const daysParticipated = new Set(
        challengeCheckins.map(c => c.checkinDate)
      ).size;

      const checkinDates = challengeCheckins.map(c => c.checkinDate);
      const currentStreak = calculateActiveStreak(checkinDates);
      const longestStreak = Math.max(
        currentStreak,
        participant.longestStreak || 0
      );

      const sortedDates = [...new Set(checkinDates)].sort().reverse();
      const lastCheckinDate = sortedDates[0] || participant.lastCheckinDate;

      dispatch(
        updateParticipantStats({
          id: participant.id,
          totalPoints,
          currentStreak,
          longestStreak,
          daysParticipated,
          lastCheckinDate: lastCheckinDate || getToday(),
        })
      );
    },
    [dispatch, relevantParticipants]
  );

  const handleToggleRow = useCallback(
    (row: DedupRow, currentlyAllChecked: boolean) => {
      if (!canEdit) return;

      const target = !currentlyAllChecked;

      // Collect all per-challenge changes to compute participant stats after applying them
      const mutatedCheckinsByChallenge = new Map<string, HabitCheckin | null>();

      row.entries.forEach(({ challenge, habitIndex }) => {
        const existingCheckin = relevantCheckins.find(
          c => c.challengeId === challenge.id
        );

        if (existingCheckin) {
          const updatedHabits = [...existingCheckin.habitsCompleted];
          updatedHabits[habitIndex] = target;

          if (updatedHabits.every(h => !h)) {
            dispatch(deleteCheckin(existingCheckin.id));
            mutatedCheckinsByChallenge.set(challenge.id, null);
          } else {
            dispatch(
              updateHabitCompletion({
                checkinId: existingCheckin.id,
                habitIndex,
                completed: target,
              })
            );
            mutatedCheckinsByChallenge.set(challenge.id, {
              ...existingCheckin,
              habitsCompleted: updatedHabits,
              pointsEarned: updatedHabits.filter(h => h).length,
              allHabitsCompleted: updatedHabits.every(h => h),
              updatedAt: new Date().toISOString(),
            });
          }
        } else {
          if (!target) return; // unchecking a non-existent checkin is a no-op
          const habitsCompleted = (challenge.habits || []).map(
            (_, i) => i === habitIndex
          );
          const cycle = challenge.isRecurring
            ? getCycleForDate(challenge, checkinDate)
            : undefined;
          const newCheckin: HabitCheckin = {
            id: Crypto.randomUUID(),
            challengeId: challenge.id,
            userId: user?.id || 'anonymous',
            userName: user?.email?.split('@')[0] || 'Anonymous',
            checkinDate,
            habitsCompleted,
            pointsEarned: habitsCompleted.filter(h => h).length,
            allHabitsCompleted: habitsCompleted.every(h => h),
            cycle,
            updatedAt: new Date().toISOString(),
          };
          dispatch(addCheckin(newCheckin));
          mutatedCheckinsByChallenge.set(challenge.id, newCheckin);
        }
      });

      // Build an updated "all user checkins" set and update stats per affected challenge
      let updatedAllCheckins = [...allUserCheckins];
      mutatedCheckinsByChallenge.forEach((updatedCheckin, challengeId) => {
        // Remove all existing checkins for this challenge on this date
        updatedAllCheckins = updatedAllCheckins.filter(
          c => !(c.challengeId === challengeId && c.checkinDate === checkinDate)
        );
        if (updatedCheckin) {
          updatedAllCheckins.push(updatedCheckin);
        }
      });

      row.entries.forEach(({ challenge }) => {
        updateStatsForChallenge(challenge, updatedAllCheckins);
      });
    },
    [
      canEdit,
      relevantCheckins,
      allUserCheckins,
      dispatch,
      user?.id,
      user?.email,
      checkinDate,
      updateStatsForChallenge,
    ]
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        glassStyle,
      ]}
    >
      {/* Progress header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            {completedEntries} of {totalEntries} completed
          </Text>
          {completedEntries === totalEntries && totalEntries > 0 && (
            <View
              style={[
                styles.completeBadge,
                { backgroundColor: colors.success },
              ]}
            >
              <Ionicons name="checkmark" size={12} color="#fff" />
              <Text style={styles.completeText}>All done!</Text>
            </View>
          )}
        </View>
        <Text style={[styles.pointsText, { color: colors.primary }]}>
          {completedEntries}/{totalEntries}
        </Text>
      </View>

      {dedupRows.length === 0 ? (
        <View style={styles.emptyRow}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No habits across your active challenges.
          </Text>
        </View>
      ) : (
        dedupRows.map((row, index) => {
          const { allChecked } = rowCompletion[index];
          const isShared = row.entries.length > 1;
          return (
            <TouchableOpacity
              key={row.normalizedText}
              style={[
                styles.habitRow,
                { borderBottomColor: colors.border },
                index === dedupRows.length - 1 && styles.lastRow,
              ]}
              onPress={() => handleToggleRow(row, allChecked)}
              activeOpacity={canEdit ? 0.7 : 1}
              disabled={!canEdit}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: allChecked, disabled: !canEdit }}
              accessibilityLabel={`${row.displayText}${
                isShared
                  ? `, shared across ${row.entries.length} challenges`
                  : ''
              }`}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: allChecked ? colors.primary : 'transparent',
                    borderColor: allChecked ? colors.primary : colors.border,
                  },
                ]}
              >
                {allChecked && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <View style={styles.textColumn}>
                <Text
                  style={[
                    styles.habitText,
                    { color: colors.text },
                    allChecked && styles.habitTextCompleted,
                  ]}
                  numberOfLines={2}
                >
                  {row.displayText}
                </Text>
                {isShared && (
                  <View style={styles.challengeTagsRow}>
                    {row.entries.map(({ challenge }) => (
                      <View
                        key={challenge.id}
                        style={[
                          styles.challengeTag,
                          { borderColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.challengeTagText,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {challenge.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}
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
    alignItems: 'flex-start',
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
    marginTop: 1,
  },
  textColumn: {
    flex: 1,
    gap: 6,
  },
  habitText: {
    fontSize: 15,
  },
  habitTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  challengeTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  challengeTag: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  challengeTagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  emptyRow: {
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
