import React from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimeFieldProps } from './types';

export default function TimeField({
  value,
  onChange,
  disabled,
  accessibilityLabel,
  testID,
  display,
  minuteInterval,
}: DateTimeFieldProps) {
  return (
    <DateTimePicker
      value={value}
      mode="time"
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      display={display}
      minuteInterval={minuteInterval}
      onChange={(event, selectedDate) => {
        if (event.type !== 'dismissed' && selectedDate) onChange(selectedDate);
      }}
    />
  );
}
