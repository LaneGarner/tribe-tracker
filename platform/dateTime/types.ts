export interface DateTimeFieldProps {
  value: Date;
  onChange: (value: Date) => void;
  onDismiss?: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  display?: 'default' | 'spinner' | 'compact' | 'inline';
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
}
