import React from 'react';
import { dateWithValue, formatDateValue } from './conversions';
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
    <input
      type="date"
      value={formatDateValue(value)}
      min={minimumDate ? formatDateValue(minimumDate) : undefined}
      max={maximumDate ? formatDateValue(maximumDate) : undefined}
      disabled={disabled}
      aria-label={accessibilityLabel}
      data-testid={testID}
      style={inputStyle}
      onChange={event => {
        const next = dateWithValue(value, event.currentTarget.value);
        if (next) onChange(next);
      }}
    />
  );
}
