import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { Challenge, HabitCheckin } from '../../types';
import { getToday } from '../../utils/dateUtils';

// Predefined color palette for challenges
const CHALLENGE_COLORS = [
  '#3B82F6', // blue
  '#A855F7', // purple
  '#EC4899', // pink
  '#F59E0B', // amber
  '#10B981', // emerald
  '#EF4444', // red
  '#06B6D4', // cyan
  '#84CC16', // lime
];

interface ActivityCalendarProps {
  challenges: Challenge[];
  checkins: HabitCheckin[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  challengeColors?: Record<string, string>;
  displayMonth?: string;        // 'YYYY-MM' format, defaults to selectedDate's month
  onMonthChange?: (month: string) => void;
  minMonth?: string;            // earliest valid month
  maxMonth?: string;            // latest valid month
  onPrevious?: () => void;      // for arrow button animation sync
  onNext?: () => void;
}

export default function ActivityCalendar({
  challenges,
  checkins,
  selectedDate,
  onDateSelect,
  challengeColors: customColors,
  displayMonth: displayMonthProp,
  onMonthChange,
  minMonth,
  maxMonth,
  onPrevious,
  onNext,
}: ActivityCalendarProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const today = getToday();

  // Generate challenge colors if not provided
  const challengeColors = useMemo(() => {
    if (customColors) return customColors;
    const colorMap: Record<string, string> = {};
    challenges.forEach((challenge, index) => {
      colorMap[challenge.id] = CHALLENGE_COLORS[index % CHALLENGE_COLORS.length];
    });
    return colorMap;
  }, [challenges, customColors]);

  // Get the month to display - use prop if provided, otherwise derive from selectedDate
  const displayMonth = displayMonthProp
    ? dayjs(displayMonthProp + '-01')
    : dayjs(selectedDate);

  // Month navigation constraints
  const currentMonthStr = displayMonth.format('YYYY-MM');
  const canGoBack = !minMonth || currentMonthStr > minMonth;
  const canGoForward = !maxMonth || currentMonthStr < maxMonth;

  const handlePreviousMonth = () => {
    if (canGoBack) {
      const prevMonth = displayMonth.subtract(1, 'month').format('YYYY-MM');
      if (onPrevious) {
        onPrevious();
      }
      onMonthChange?.(prevMonth);
    }
  };

  const handleNextMonth = () => {
    if (canGoForward) {
      const nextMonth = displayMonth.add(1, 'month').format('YYYY-MM');
      if (onNext) {
        onNext();
      }
      onMonthChange?.(nextMonth);
    }
  };
  const startDay = displayMonth.startOf('month').day(); // 0-6 (Sun-Sat)
  const daysInMonth = displayMonth.daysInMonth();

  // Build checkin map for quick lookup: date -> challengeIds with checkins
  const checkinMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    checkins.forEach(checkin => {
      if (!map[checkin.checkinDate]) {
        map[checkin.checkinDate] = new Set();
      }
      // Only add if there's at least one habit completed
      if (checkin.habitsCompleted.some(h => h)) {
        map[checkin.checkinDate].add(checkin.challengeId);
      }
    });
    return map;
  }, [checkins]);

  // Build perfect day map: date -> true if all habits completed for all challenges
  const perfectDayMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (challenges.length === 0) return map;

    // Group checkins by date
    const checkinsByDate: Record<string, HabitCheckin[]> = {};
    checkins.forEach(checkin => {
      if (!checkinsByDate[checkin.checkinDate]) {
        checkinsByDate[checkin.checkinDate] = [];
      }
      checkinsByDate[checkin.checkinDate].push(checkin);
    });

    // Check each date
    Object.entries(checkinsByDate).forEach(([date, dayCheckins]) => {
      // For each active challenge, check if there's a checkin with all habits completed
      const allComplete = challenges.every(challenge => {
        const checkin = dayCheckins.find(c => c.challengeId === challenge.id);
        return checkin?.allHabitsCompleted === true;
      });
      if (allComplete) {
        map[date] = true;
      }
    });

    return map;
  }, [checkins, challenges]);

  // Generate calendar grid
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < startDay; i++) {
    currentWeek.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill remaining days with empty cells
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getDateString = (day: number) => {
    return displayMonth.date(day).format('YYYY-MM-DD');
  };

  // Check if a date falls within any challenge's active period
  const isWithinChallenge = (day: number) => {
    const dateStr = getDateString(day);
    return challenges.some(challenge => {
      const start = challenge.startDate;
      const end = challenge.endDate || today;
      return dateStr >= start && dateStr <= end;
    });
  };

  const isSelected = (day: number) => {
    return getDateString(day) === selectedDate;
  };

  const isDateToday = (day: number) => {
    return getDateString(day) === today;
  };

  const isFuture = (day: number) => {
    return getDateString(day) > today;
  };

  const getActivityDots = (day: number) => {
    const dateStr = getDateString(day);
    const challengeIds = checkinMap[dateStr];
    if (!challengeIds) return [];

    // Return unique colors for challenges with checkins on this day
    return Array.from(challengeIds)
      .filter(id => challengeColors[id])
      .map(id => challengeColors[id])
      .slice(0, 3); // Max 3 dots
  };

  const isPerfectDay = (day: number) => {
    const dateStr = getDateString(day);
    return perfectDayMap[dateStr] === true;
  };

  const inactiveBackground = colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Month header with navigation */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[
            styles.monthArrowButton,
            { borderColor: colors.border },
            !canGoBack && styles.monthArrowButtonDisabled,
          ]}
          onPress={handlePreviousMonth}
          disabled={!canGoBack}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={canGoBack ? colors.text : colors.textTertiary}
          />
        </TouchableOpacity>

        <View style={styles.monthInfo}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.monthHeader, { color: colors.text }]}>
            {displayMonth.format('MMMM YYYY')}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.monthArrowButton,
            { borderColor: colors.border },
            !canGoForward && styles.monthArrowButtonDisabled,
          ]}
          onPress={handleNextMonth}
          disabled={!canGoForward}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={canGoForward ? colors.text : colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Click a date to view/edit that day
      </Text>

      {/* Day labels */}
      <View style={styles.dayLabelsRow}>
        {dayLabels.map((label, index) => (
          <View key={index} style={styles.dayLabelCell}>
            <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((day, dayIndex) => {
            if (day === null) {
              return <View key={dayIndex} style={styles.dayCell} />;
            }

            const selected = isSelected(day);
            const todayDate = isDateToday(day);
            const future = isFuture(day);
            const inChallenge = isWithinChallenge(day);
            const isDisabled = future || !inChallenge;
            const dots = getActivityDots(day);
            const hasActivity = dots.length > 0;
            const perfect = isPerfectDay(day);

            return (
              <TouchableOpacity
                key={dayIndex}
                style={styles.dayCell}
                onPress={() => !isDisabled && onDateSelect(getDateString(day))}
                disabled={isDisabled}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.dayBox,
                    { backgroundColor: inactiveBackground },
                    todayDate && !selected && inChallenge && {
                      borderWidth: 1.5,
                      borderColor: colors.primary,
                    },
                    selected && { backgroundColor: colors.primary },
                    isDisabled && { backgroundColor: 'transparent' },
                    // Future days within challenge get dotted border
                    future && inChallenge && {
                      borderWidth: 1.5,
                      borderColor: colors.textTertiary,
                      borderStyle: 'dashed',
                    },
                  ]}
                >
                  {/* Perfect day badge */}
                  {perfect && (
                    <View style={[styles.perfectBadge, { backgroundColor: '#22C55E' }]}>
                      <Ionicons name="checkmark" size={8} color="#fff" />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.dayText,
                      { color: colors.text },
                      selected && { color: '#fff', fontWeight: '600' },
                      isDisabled && { color: colors.textTertiary },
                    ]}
                  >
                    {day}
                  </Text>
                  {/* Activity dots inside box */}
                  <View style={styles.dotsContainer}>
                    {hasActivity ? (
                      dots.map((dotColor, dotIndex) => (
                        <View
                          key={dotIndex}
                          style={[
                            styles.dot,
                            { backgroundColor: selected ? 'rgba(255,255,255,0.9)' : dotColor },
                          ]}
                        />
                      ))
                    ) : !isDisabled ? (
                      <View style={styles.dotPlaceholder} />
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Challenge legend */}
      {challenges.length > 0 && (
        <View style={styles.legend}>
          {challenges.map(challenge => (
            <View key={challenge.id} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: challengeColors[challenge.id] },
                ]}
              />
              <Text
                style={[styles.legendText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {challenge.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export { CHALLENGE_COLORS };

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  monthInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthHeader: {
    fontSize: 17,
    fontWeight: '600',
  },
  monthArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowButtonDisabled: {
    opacity: 0.4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
    overflow: 'visible',
  },
  dayBox: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    position: 'relative',
    overflow: 'visible',
  },
  perfectBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 3,
    height: 8,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotPlaceholder: {
    width: 6,
    height: 6,
  },
  legend: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },
});
