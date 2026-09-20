import React from 'react';
import { formatTimeValue, timeWithValue } from './conversions';
import type { DateTimeFieldProps } from './types';

const inputStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  minHeight: 44,
  maxWidth: '100%',
  padding: '8px 12px',
  border: '1px solid #D1D5DB',
  borderRadius: 8,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
};

export default function TimeField({
  value,
  onChange,
  disabled,
  accessibilityLabel,
  testID,
  minuteInterval,
}: DateTimeFieldProps) {
  return (
    <input
      type="time"
      value={formatTimeValue(value)}
      disabled={disabled}
      aria-label={accessibilityLabel}
      data-testid={testID}
      step={minuteInterval ? minuteInterval * 60 : undefined}
      style={inputStyle}
      onChange={event => {
        const next = timeWithValue(value, event.currentTarget.value);
        if (next) onChange(next);
      }}
    />
  );
}
