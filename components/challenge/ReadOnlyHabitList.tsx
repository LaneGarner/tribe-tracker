import React, { useContext } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { Challenge } from '../../types';
import { formatDate, getDaysRemaining } from '../../utils/dateUtils';

interface ReadOnlyHabitListProps {
  challenge: Challenge;
  hasBackgroundImage?: boolean;
}

export default function ReadOnlyHabitList({
  challenge,
  hasBackgroundImage,
}: ReadOnlyHabitListProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const daysUntilStart = getDaysRemaining(challenge.startDate);

  const glassStyle: ViewStyle | undefined = hasBackgroundImage ? {
    backgroundColor: colorScheme === 'dark'
      ? 'rgba(24, 24, 27, 0.72)'
      : 'rgba(255, 255, 255, 0.88)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colorScheme === 'dark'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.3,
    shadowRadius: 4,
    elevation: 2,
  } : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, glassStyle]}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>
            Starts {formatDate(challenge.startDate, 'MMM D')} ({daysUntilStart} day{daysUntilStart !== 1 ? 's' : ''})
          </Text>
        </View>
      </View>

      {challenge.habits.map((habit, index) => (
        <View
          key={index}
          style={[
            styles.habitRow,
            { borderBottomColor: colors.border },
            index === challenge.habits.length - 1 && styles.lastRow,
          ]}
        >
          <View style={[styles.bullet, { borderColor: colors.border }]} />
          <Text style={[styles.habitText, { color: colors.text }]}>
            {habit}
          </Text>
        </View>
      ))}
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
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '500',
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
  bullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  habitText: {
    flex: 1,
    fontSize: 15,
  },
});
