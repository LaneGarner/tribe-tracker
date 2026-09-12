import { applyNativePickerEvent } from '../../platform/dateTime/nativeEvents';

describe('native date/time picker events', () => {
  it('signals dismissal without changing the value', () => {
    const onChange = jest.fn();
    const onDismiss = jest.fn();
    applyNativePickerEvent('dismissed', undefined, onChange, onDismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('preserves selected-date behavior', () => {
    const onChange = jest.fn();
    const selected = new Date(2026, 8, 12, 20, 30);
    applyNativePickerEvent('set', selected, onChange);
    expect(onChange).toHaveBeenCalledWith(selected);
  });
});
