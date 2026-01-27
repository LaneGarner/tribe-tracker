import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
}

export default function DateCarousel({
  selectedDate,
  onDateChange,
  minDate,
  onPrevious,
  onNext,
}: DateCarouselProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const today = getToday();
  const isSelectedToday = isToday(selectedDate);
  const canGoForward = selectedDate < today;
  const canGoBack = !minDate || selectedDate > minDate;

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
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={[
          styles.arrowButton,
          { borderColor: colors.border },
          !canGoBack && styles.arrowButtonDisabled,
        ]}
        onPress={handlePrevious}
        disabled={!canGoBack}
      >
        <Ionicons
          name="chevron-back"
          size={20}
          color={canGoBack ? colors.text : colors.textTertiary}
        />
      </TouchableOpacity>

      <View style={styles.dateInfo}>
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
      </View>

      <TouchableOpacity
        style={[
          styles.arrowButton,
          { borderColor: colors.border },
          !canGoForward && styles.arrowButtonDisabled,
        ]}
        onPress={handleNext}
        disabled={!canGoForward}
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color={canGoForward ? colors.text : colors.textTertiary}
        />
      </TouchableOpacity>
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
  arrowButtonDisabled: {
    opacity: 0.4,
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
