import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import {
  getToday,
  formatDate,
  isToday,
  addDays,
  subtractDays,
} from '../../utils/dateUtils';

interface DateCarouselProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  minDate?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasBackgroundImage?: boolean;
}

export default function DateCarousel({
  selectedDate,
  onDateChange,
  minDate,
  onPrevious,
  onNext,
  hasBackgroundImage,
}: DateCarouselProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const glassStyle: ViewStyle | undefined = hasBackgroundImage ? {
    backgroundColor: colorScheme === 'dark'
      ? 'rgba(24, 24, 27, 0.72)'
      : 'rgba(255, 255, 255, 0.78)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colorScheme === 'dark'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.12,
    shadowRadius: 4,
    elevation: 2,
  } : undefined;

  const today = getToday();
  const isSelectedToday = isToday(selectedDate);
  // Normalize dates to YYYY-MM-DD for consistent comparison
  const selectedNormalized = dayjs(selectedDate).format('YYYY-MM-DD');
  const minNormalized = minDate ? dayjs(minDate).format('YYYY-MM-DD') : null;
  const canGoForward = selectedNormalized < today;
  const canGoBack = !minNormalized || selectedNormalized > minNormalized;

  const handlePrevious = () => {
    if (canGoBack) {
      if (onPrevious) {
        onPrevious();
      } else {
        onDateChange(subtractDays(selectedDate, 1));
      }
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      if (onNext) {
        onNext();
      } else {
        onDateChange(addDays(selectedDate, 1));
      }
    }
  };

  const getDateLabel = (): string => {
    if (isSelectedToday) return 'Today';
    const yesterday = subtractDays(today, 1);
    if (selectedDate === yesterday) return 'Yesterday';
    return formatDate(selectedDate, 'MMM D');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, glassStyle]}>
      {canGoBack ? (
        <TouchableOpacity
          style={[styles.arrowButton, { borderColor: colors.border }]}
          onPress={handlePrevious}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.arrowPlaceholder} />
      )}

      <TouchableOpacity
        style={styles.dateInfo}
        onPress={() => onDateChange(today)}
        disabled={isSelectedToday}
        accessibilityRole="button"
        accessibilityLabel="Go to today"
      >
        <View style={styles.dateLabelRow}>
          <Ionicons
            name="calendar-outline"
            size={18}
            color={colors.text}
            style={styles.calendarIcon}
          />
          <Text style={[styles.dateLabel, { color: colors.text }]}>
            {getDateLabel()}
          </Text>
        </View>
        <Text style={[styles.dayOfWeek, { color: colors.textSecondary }]}>
          {formatDate(selectedDate, 'dddd')}
        </Text>
      </TouchableOpacity>

      {canGoForward ? (
        <TouchableOpacity
          style={[styles.arrowButton, { borderColor: colors.border }]}
          onPress={handleNext}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.arrowPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowPlaceholder: {
    width: 40,
    height: 40,
  },
  dateInfo: {
    alignItems: 'center',
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    marginRight: 6,
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  dayOfWeek: {
    fontSize: 14,
    marginTop: 2,
  },
});
