import React from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimeFieldProps } from './types';
import { applyNativePickerEvent } from './nativeEvents';

export default function TimeField({
  value,
  onChange,
  onDismiss,
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
        applyNativePickerEvent(event.type, selectedDate, onChange, onDismiss);
      }}
    />
  );
}
