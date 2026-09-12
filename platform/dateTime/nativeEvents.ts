export function applyNativePickerEvent(
  eventType: string,
  selectedDate: Date | undefined,
  onChange: (value: Date) => void,
  onDismiss?: () => void
): void {
  if (eventType === 'dismissed') {
    onDismiss?.();
    return;
  }
  if (selectedDate) onChange(selectedDate);
}
