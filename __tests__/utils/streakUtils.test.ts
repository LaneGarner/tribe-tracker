import { calculateActiveStreak } from '../../utils/streakUtils';

const TODAY = '2024-06-15';

describe('calculateActiveStreak', () => {
  it('returns 0 for an empty array', () => {
    expect(calculateActiveStreak([], TODAY)).toBe(0);
  });

  it('returns 1 when only today is checked in', () => {
    expect(calculateActiveStreak(['2024-06-15'], TODAY)).toBe(1);
  });

  it('returns 0 when only yesterday is checked in (no checkin today)', () => {
    expect(calculateActiveStreak(['2024-06-14'], TODAY)).toBe(0);
  });

  it('returns 0 when checkins exist but none for today', () => {
    expect(
      calculateActiveStreak(['2024-06-10', '2024-06-11', '2024-06-12'], TODAY)
    ).toBe(0);
  });

  it('counts 3 consecutive days ending today', () => {
    expect(
      calculateActiveStreak(['2024-06-13', '2024-06-14', '2024-06-15'], TODAY)
    ).toBe(3);
  });

  it('stops counting at first gap', () => {
    // Gap on June 13 — streak should be 2 (today + yesterday)
    expect(
      calculateActiveStreak(
        ['2024-06-12', '2024-06-14', '2024-06-15'],
        TODAY
      )
    ).toBe(2);
  });

  it('handles unsorted input', () => {
    const dates = ['2024-06-14', '2024-06-12', '2024-06-15', '2024-06-13'];
    expect(calculateActiveStreak(dates, TODAY)).toBe(4);
  });

  it('deduplicates dates', () => {
    const dates = [
      '2024-06-15',
      '2024-06-15',
      '2024-06-14',
      '2024-06-14',
      '2024-06-13',
    ];
    expect(calculateActiveStreak(dates, TODAY)).toBe(3);
  });

  it('counts a long streak (30+ days)', () => {
    const dates: string[] = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(2024, 5, 15 - i); // June 15 back to May 12
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    expect(calculateActiveStreak(dates, TODAY)).toBe(35);
  });

  it('ignores future dates and returns correct streak', () => {
    // Future dates should be sorted before today, so sortedDates[0] would be
    // a future date, not today — meaning the streak should be 0
    const dates = ['2024-06-16', '2024-06-15', '2024-06-14'];
    expect(calculateActiveStreak(dates, TODAY)).toBe(0);
  });

  it('returns 1 when today has checkin but yesterday does not', () => {
    const dates = ['2024-06-15', '2024-06-10'];
    expect(calculateActiveStreak(dates, TODAY)).toBe(1);
  });

  it('handles a streak crossing a month boundary', () => {
    const today = '2024-07-02';
    const dates = ['2024-06-29', '2024-06-30', '2024-07-01', '2024-07-02'];
    expect(calculateActiveStreak(dates, today)).toBe(4);
  });

  it('handles a streak crossing a year boundary', () => {
    const today = '2025-01-02';
    const dates = ['2024-12-31', '2025-01-01', '2025-01-02'];
    expect(calculateActiveStreak(dates, today)).toBe(3);
  });
});
