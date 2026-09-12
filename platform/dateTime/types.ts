export interface DateTimeFieldProps {
  value: Date;
  onChange: (value: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}
