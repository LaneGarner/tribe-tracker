import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import * as Crypto from 'expo-crypto';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { AppDispatch } from '../../redux/store';
import { addCheckin, updateHabitCompletion } from '../../redux/slices/checkinsSlice';
import { useAuth } from '../../context/AuthContext';
import { Challenge, HabitCheckin } from '../../types';
import { getToday } from '../../utils/dateUtils';

interface HabitChecklistProps {
  challenge: Challenge;
  checkin?: HabitCheckin;
}

export default function HabitChecklist({
  challenge,
  checkin,
}: HabitChecklistProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user } = useAuth();

  const handleToggle = (habitIndex: number) => {
    if (checkin) {
      // Update existing checkin
      dispatch(
        updateHabitCompletion({
          checkinId: checkin.id,
          habitIndex,
          completed: !checkin.habitsCompleted[habitIndex],
        })
      );
    } else {
      // Create new checkin
      const habitsCompleted = challenge.habits.map((_, i) => i === habitIndex);
      const newCheckin: HabitCheckin = {
        id: Crypto.randomUUID(),
        challengeId: challenge.id,
        userId: user?.id || 'anonymous',
        userName: user?.email?.split('@')[0] || 'Anonymous',
        checkinDate: getToday(),
        habitsCompleted,
        pointsEarned: 1,
        allHabitsCompleted: habitsCompleted.every(h => h),
        updatedAt: new Date().toISOString(),
      };
      dispatch(addCheckin(newCheckin));
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
            activeOpacity={0.7}
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
