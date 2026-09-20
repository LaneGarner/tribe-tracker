import {
  dateWithValue,
  formatDateValue,
  formatTimeValue,
  timeWithValue,
} from '../../platform/dateTime/conversions';

describe('date and time field conversions', () => {
  const original = new Date(2026, 8, 12, 17, 45, 32, 123);

  it('formats values using local calendar fields', () => {
    expect(formatDateValue(original)).toBe('2026-09-12');
    expect(formatTimeValue(original)).toBe('17:45');
  });

  it('changes the calendar date without shifting the local time', () => {
    const next = dateWithValue(original, '2027-01-03');

    expect(next).not.toBeNull();
    expect(formatDateValue(next!)).toBe('2027-01-03');
    expect(formatTimeValue(next!)).toBe('17:45');
    expect(original.getFullYear()).toBe(2026);
  });

  it('changes the local time and clears seconds without changing the date', () => {
    const next = timeWithValue(original, '06:05');

    expect(next).not.toBeNull();
    expect(formatDateValue(next!)).toBe('2026-09-12');
    expect(formatTimeValue(next!)).toBe('06:05');
    expect(next?.getSeconds()).toBe(0);
    expect(next?.getMilliseconds()).toBe(0);
  });

  it('rejects malformed and out-of-range browser values', () => {
    expect(dateWithValue(original, '')).toBeNull();
    expect(dateWithValue(original, '2026-02-31')).toBeNull();
    expect(timeWithValue(original, '24:00')).toBeNull();
    expect(timeWithValue(original, '10:60')).toBeNull();
  });
});
