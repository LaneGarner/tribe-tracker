import React from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimeFieldProps } from './types';

export default function DateField({
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled,
  accessibilityLabel,
  testID,
}: DateTimeFieldProps) {
  return (
    <DateTimePicker
      value={value}
      mode="date"
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onChange={(event, selectedDate) => {
        if (event.type !== 'dismissed' && selectedDate) onChange(selectedDate);
      }}
    />
  );
}
