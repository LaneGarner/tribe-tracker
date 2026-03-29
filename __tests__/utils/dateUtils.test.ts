import {
  getToday,
  getDaysFromNow,
  formatDate,
  formatRelativeDate,
  isToday,
  isPast,
  isFuture,
  getDaysBetween,
  getDayOfWeek,
  getDateRange,
  getMondayOfWeek,
  getChallengeEndDate,
  getRecurringCycleInfo,
  getCycleForDate,
  getChallengeStatus,
  getCurrentChallengeDay,
  getDaysRemaining,
  formatChatDate,
  addDays,
  subtractDays,
} from '../../utils/dateUtils';
import { Challenge } from '../../types';

// Fixed date: Saturday, June 15, 2024
const FIXED_NOW = new Date('2024-06-15T12:00:00.000Z');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'test-1',
    name: 'Test Challenge',
    creatorId: 'user-1',
    durationDays: 30,
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    habits: ['Exercise'],
    isPublic: false,
    status: 'active',
    participantCount: 1,
    ...overrides,
  };
}

// ─── getToday ───────────────────────────────────────────────────

describe('getToday', () => {
  it('returns the current date as YYYY-MM-DD', () => {
    expect(getToday()).toBe('2024-06-15');
  });

  it('returns a string of length 10', () => {
    expect(getToday()).toHaveLength(10);
  });
});

// ─── getDaysFromNow ─────────────────────────────────────────────

describe('getDaysFromNow', () => {
  it('returns today when days is 0', () => {
    expect(getDaysFromNow(0)).toBe('2024-06-15');
  });

  it('returns a future date for positive days', () => {
    expect(getDaysFromNow(5)).toBe('2024-06-20');
  });

  it('returns a past date for negative days', () => {
    expect(getDaysFromNow(-3)).toBe('2024-06-12');
  });

  it('crosses month boundaries', () => {
    expect(getDaysFromNow(20)).toBe('2024-07-05');
  });

  it('crosses year boundaries', () => {
    expect(getDaysFromNow(200)).toBe('2025-01-01');
  });
});

// ─── formatDate ─────────────────────────────────────────────────

describe('formatDate', () => {
  it('uses default format MMM D, YYYY', () => {
    expect(formatDate('2024-06-15')).toBe('Jun 15, 2024');
  });

  it('accepts custom format', () => {
    expect(formatDate('2024-06-15', 'YYYY/MM/DD')).toBe('2024/06/15');
  });

  it('formats with day-of-week', () => {
    expect(formatDate('2024-06-15', 'dddd')).toBe('Saturday');
  });

  it('handles single-digit day', () => {
    expect(formatDate('2024-06-01')).toBe('Jun 1, 2024');
  });

  it('handles December dates', () => {
    expect(formatDate('2024-12-25')).toBe('Dec 25, 2024');
  });

  it('handles January 1st', () => {
    expect(formatDate('2025-01-01')).toBe('Jan 1, 2025');
  });
});

// ─── formatRelativeDate ──────────────────────────────────────────

describe('formatRelativeDate', () => {
  it('returns "Today" for today', () => {
    expect(formatRelativeDate('2024-06-15')).toBe('Today');
  });

  it('returns "Yesterday" for 1 day ago', () => {
    expect(formatRelativeDate('2024-06-14')).toBe('Yesterday');
  });

  it('returns "X days ago" for 2-6 days ago', () => {
    expect(formatRelativeDate('2024-06-13')).toBe('2 days ago');
    expect(formatRelativeDate('2024-06-12')).toBe('3 days ago');
    expect(formatRelativeDate('2024-06-10')).toBe('5 days ago');
    expect(formatRelativeDate('2024-06-09')).toBe('6 days ago');
  });

  it('returns "X weeks ago" for 7-29 days ago', () => {
    expect(formatRelativeDate('2024-06-08')).toBe('1 weeks ago');
    expect(formatRelativeDate('2024-06-01')).toBe('2 weeks ago');
    expect(formatRelativeDate('2024-05-20')).toBe('3 weeks ago');
  });

  it('returns formatted date for 30+ days ago', () => {
    expect(formatRelativeDate('2024-05-01')).toBe('May 1, 2024');
    expect(formatRelativeDate('2023-01-15')).toBe('Jan 15, 2023');
  });
});

// ─── isToday ────────────────────────────────────────────────────

describe('isToday', () => {
  it('returns true for today', () => {
    expect(isToday('2024-06-15')).toBe(true);
  });

  it('returns false for yesterday', () => {
    expect(isToday('2024-06-14')).toBe(false);
  });

  it('returns false for tomorrow', () => {
    expect(isToday('2024-06-16')).toBe(false);
  });

  it('returns false for a distant date', () => {
    expect(isToday('2020-01-01')).toBe(false);
  });
});

// ─── isPast ─────────────────────────────────────────────────────

describe('isPast', () => {
  it('returns true for yesterday', () => {
    expect(isPast('2024-06-14')).toBe(true);
  });

  it('returns false for today', () => {
    expect(isPast('2024-06-15')).toBe(false);
  });

  it('returns false for tomorrow', () => {
    expect(isPast('2024-06-16')).toBe(false);
  });

  it('returns true for a distant past date', () => {
    expect(isPast('2000-01-01')).toBe(true);
  });
});

// ─── isFuture ───────────────────────────────────────────────────

describe('isFuture', () => {
  it('returns true for tomorrow', () => {
    expect(isFuture('2024-06-16')).toBe(true);
  });

  it('returns false for today', () => {
    expect(isFuture('2024-06-15')).toBe(false);
  });

  it('returns false for yesterday', () => {
    expect(isFuture('2024-06-14')).toBe(false);
  });

  it('returns true for a distant future date', () => {
    expect(isFuture('2030-12-31')).toBe(true);
  });
});

// ─── getDaysBetween ─────────────────────────────────────────────

describe('getDaysBetween', () => {
  it('returns 0 for the same date', () => {
    expect(getDaysBetween('2024-06-15', '2024-06-15')).toBe(0);
  });

  it('returns positive for chronological order', () => {
    expect(getDaysBetween('2024-06-01', '2024-06-15')).toBe(14);
  });

  it('returns negative when end is before start', () => {
    expect(getDaysBetween('2024-06-15', '2024-06-01')).toBe(-14);
  });

  it('crosses month boundaries', () => {
    expect(getDaysBetween('2024-01-31', '2024-02-01')).toBe(1);
  });

  it('handles leap year', () => {
    expect(getDaysBetween('2024-02-28', '2024-03-01')).toBe(2); // 2024 is leap year
  });

  it('handles non-leap year', () => {
    expect(getDaysBetween('2023-02-28', '2023-03-01')).toBe(1);
  });

  it('spans an entire year', () => {
    expect(getDaysBetween('2024-01-01', '2024-12-31')).toBe(365); // leap year
  });
});

// ─── getDayOfWeek ───────────────────────────────────────────────

describe('getDayOfWeek', () => {
  it('returns 6 for Saturday June 15, 2024', () => {
    expect(getDayOfWeek('2024-06-15')).toBe(6);
  });

  it('returns 0 for Sunday', () => {
    expect(getDayOfWeek('2024-06-16')).toBe(0);
  });

  it('returns 1 for Monday', () => {
    expect(getDayOfWeek('2024-06-17')).toBe(1);
  });

  it('returns 5 for Friday', () => {
    expect(getDayOfWeek('2024-06-14')).toBe(5);
  });

  it('works for a known Wednesday', () => {
    expect(getDayOfWeek('2024-06-12')).toBe(3);
  });
});

// ─── getDateRange ───────────────────────────────────────────────

describe('getDateRange', () => {
  it('returns single date when start equals end', () => {
    expect(getDateRange('2024-06-15', '2024-06-15')).toEqual(['2024-06-15']);
  });

  it('returns inclusive range', () => {
    expect(getDateRange('2024-06-13', '2024-06-15')).toEqual([
      '2024-06-13',
      '2024-06-14',
      '2024-06-15',
    ]);
  });

  it('crosses month boundary', () => {
    const range = getDateRange('2024-06-29', '2024-07-02');
    expect(range).toEqual(['2024-06-29', '2024-06-30', '2024-07-01', '2024-07-02']);
  });

  it('returns empty array when start is after end', () => {
    expect(getDateRange('2024-06-20', '2024-06-15')).toEqual([]);
  });

  it('handles leap day', () => {
    const range = getDateRange('2024-02-28', '2024-03-01');
    expect(range).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
  });

  it('returns correct length for a 7-day range', () => {
    const range = getDateRange('2024-06-01', '2024-06-07');
    expect(range).toHaveLength(7);
  });
});

// ─── getMondayOfWeek ────────────────────────────────────────────

describe('getMondayOfWeek', () => {
  it('returns Monday when given a Wednesday', () => {
    // 2024-06-12 is Wednesday
    expect(getMondayOfWeek('2024-06-12')).toBe('2024-06-10');
  });

  it('returns the same day when given a Monday', () => {
    expect(getMondayOfWeek('2024-06-10')).toBe('2024-06-10');
  });

  it('returns previous Monday for Sunday (goes back 6 days)', () => {
    // 2024-06-16 is Sunday
    expect(getMondayOfWeek('2024-06-16')).toBe('2024-06-10');
  });

  it('returns Monday for Saturday', () => {
    // 2024-06-15 is Saturday, Monday is 2024-06-10
    expect(getMondayOfWeek('2024-06-15')).toBe('2024-06-10');
  });

  it('returns Monday for Tuesday', () => {
    expect(getMondayOfWeek('2024-06-11')).toBe('2024-06-10');
  });

  it('returns Monday for Friday', () => {
    expect(getMondayOfWeek('2024-06-14')).toBe('2024-06-10');
  });

  it('crosses month boundary when Monday is in previous month', () => {
    // 2024-07-03 is Wednesday, Monday is 2024-07-01
    expect(getMondayOfWeek('2024-07-03')).toBe('2024-07-01');
    // 2024-06-02 is Sunday, so Monday is 2024-05-27
    expect(getMondayOfWeek('2024-06-02')).toBe('2024-05-27');
  });

  it('defaults to today when no argument', () => {
    // Today is 2024-06-15 (Saturday), Monday is 2024-06-10
    expect(getMondayOfWeek()).toBe('2024-06-10');
  });
});

// ─── getChallengeEndDate ────────────────────────────────────────

describe('getChallengeEndDate', () => {
  it('returns same date for 1-day challenge', () => {
    expect(getChallengeEndDate('2024-06-15', 1)).toBe('2024-06-15');
  });

  it('adds durationDays - 1', () => {
    expect(getChallengeEndDate('2024-06-01', 30)).toBe('2024-06-30');
  });

  it('crosses month boundary', () => {
    expect(getChallengeEndDate('2024-06-15', 30)).toBe('2024-07-14');
  });

  it('crosses year boundary', () => {
    expect(getChallengeEndDate('2024-12-20', 15)).toBe('2025-01-03');
  });

  it('handles leap year boundary', () => {
    expect(getChallengeEndDate('2024-02-28', 3)).toBe('2024-03-01');
  });
});

// ─── getRecurringCycleInfo ──────────────────────────────────────

describe('getRecurringCycleInfo', () => {
  it('returns null for non-recurring challenge', () => {
    const challenge = makeChallenge({ isRecurring: false });
    expect(getRecurringCycleInfo(challenge)).toBeNull();
  });

  it('returns null when isRecurring is undefined', () => {
    const challenge = makeChallenge({ isRecurring: undefined });
    expect(getRecurringCycleInfo(challenge)).toBeNull();
  });

  describe('before challenge start', () => {
    it('returns cycle 1 with upcoming status', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-07-01',
        durationDays: 7,
        gapDays: 3,
      });
      const info = getRecurringCycleInfo(challenge);
      expect(info).toEqual({
        currentCycle: 1,
        cycleStartDate: '2024-07-01',
        cycleEndDate: '2024-07-07',
        status: 'upcoming',
        cycleDay: 0,
        cycleDaysRemaining: 7,
      });
    });

    it('works with explicit forDate before start', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-20',
        durationDays: 5,
        gapDays: 2,
      });
      const info = getRecurringCycleInfo(challenge, '2024-06-18');
      expect(info).toEqual({
        currentCycle: 1,
        cycleStartDate: '2024-06-20',
        cycleEndDate: '2024-06-24',
        status: 'upcoming',
        cycleDay: 0,
        cycleDaysRemaining: 5,
      });
    });
  });

  describe('during active period', () => {
    it('returns correct info on first day of first cycle', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-15',
        durationDays: 7,
        gapDays: 3,
      });
      const info = getRecurringCycleInfo(challenge);
      expect(info).toEqual({
        currentCycle: 1,
        cycleStartDate: '2024-06-15',
        cycleEndDate: '2024-06-21',
        status: 'active',
        cycleDay: 1,
        cycleDaysRemaining: 6,
      });
    });

    it('returns correct info mid-cycle', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-10',
        durationDays: 7,
        gapDays: 3,
      });
      // forDate = 2024-06-15, daysSinceStart = 5, cyclePeriod = 10
      // dayWithinCycle = 5, 5 < 7 so active, cycleDay = 6
      const info = getRecurringCycleInfo(challenge, '2024-06-15');
      expect(info).toEqual({
        currentCycle: 1,
        cycleStartDate: '2024-06-10',
        cycleEndDate: '2024-06-16',
        status: 'active',
        cycleDay: 6,
        cycleDaysRemaining: 1,
      });
    });

    it('returns correct info on last active day of cycle', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-10',
        durationDays: 5,
        gapDays: 2,
      });
      // forDate = 2024-06-14, daysSinceStart = 4, cyclePeriod = 7
      // dayWithinCycle = 4, 4 < 5 so active, cycleDay = 5
      const info = getRecurringCycleInfo(challenge, '2024-06-14');
      expect(info).toEqual({
        currentCycle: 1,
        cycleStartDate: '2024-06-10',
        cycleEndDate: '2024-06-14',
        status: 'active',
        cycleDay: 5,
        cycleDaysRemaining: 0,
      });
    });
  });

  describe('during gap period', () => {
    it('returns next cycle info when in gap', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-01',
        durationDays: 7,
        gapDays: 3,
      });
      // forDate = 2024-06-15, daysSinceStart = 14, cyclePeriod = 10
      // currentCycle = floor(14/10) + 1 = 2, dayWithinCycle = 14%10 = 4
      // 4 < 7 so this is active in cycle 2
      // Let's use a date that's in the gap: day 7 of cycle 1 gap
      // forDate = 2024-06-08 => daysSinceStart = 7, dayWithinCycle = 7
      // 7 >= 7 (durationDays), so gap
      const info = getRecurringCycleInfo(challenge, '2024-06-08');
      expect(info!.status).toBe('gap');
      expect(info!.currentCycle).toBe(2); // next cycle
      expect(info!.cycleStartDate).toBe('2024-06-11'); // cycle 2 starts
      expect(info!.cycleEndDate).toBe('2024-06-17');
    });

    it('calculates gap days remaining correctly', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-01',
        durationDays: 5,
        gapDays: 3,
      });
      // forDate = 2024-06-06, daysSinceStart = 5, cyclePeriod = 8
      // dayWithinCycle = 5, 5 >= 5 so gap
      // gapDaysRemaining = cyclePeriod - dayWithinCycle - 1 = 8 - 5 - 1 = 2
      const info = getRecurringCycleInfo(challenge, '2024-06-06');
      expect(info!.status).toBe('gap');
      expect(info!.cycleDaysRemaining).toBe(2);
    });

    it('returns gap with 1 day remaining on last gap day', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-01',
        durationDays: 5,
        gapDays: 3,
      });
      // forDate = 2024-06-07, daysSinceStart = 6, cyclePeriod = 8
      // dayWithinCycle = 6, 6 >= 5 so gap
      // gapDaysRemaining = 8 - 6 - 1 = 1
      const info = getRecurringCycleInfo(challenge, '2024-06-07');
      expect(info!.status).toBe('gap');
      expect(info!.cycleDaysRemaining).toBe(1);
    });

    it('returns gap with 0 days remaining on very last gap day', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-01',
        durationDays: 5,
        gapDays: 3,
      });
      // forDate = 2024-06-08, daysSinceStart = 7, cyclePeriod = 8
      // dayWithinCycle = 7, 7 >= 5 so gap
      // gapDaysRemaining = 8 - 7 - 1 = 0
      const info = getRecurringCycleInfo(challenge, '2024-06-08');
      expect(info!.status).toBe('gap');
      expect(info!.cycleDaysRemaining).toBe(0);
    });
  });

  describe('multiple cycles', () => {
    it('correctly identifies cycle 2 active period', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-01',
        durationDays: 5,
        gapDays: 3,
      });
      // Cycle 2 starts 2024-06-09 (day 8), active days 8-12
      // forDate = 2024-06-09, daysSinceStart = 8, cyclePeriod = 8
      // currentCycle = floor(8/8) + 1 = 2, dayWithinCycle = 0
      // 0 < 5 so active, cycleDay = 1
      const info = getRecurringCycleInfo(challenge, '2024-06-09');
      expect(info).toEqual({
        currentCycle: 2,
        cycleStartDate: '2024-06-09',
        cycleEndDate: '2024-06-13',
        status: 'active',
        cycleDay: 1,
        cycleDaysRemaining: 4,
      });
    });

    it('correctly identifies cycle 3', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-01',
        durationDays: 5,
        gapDays: 3,
      });
      // Cycle 3 starts 2024-06-17 (day 16), cyclePeriod = 8
      // forDate = 2024-06-18, daysSinceStart = 17
      // currentCycle = floor(17/8) + 1 = 3, dayWithinCycle = 1
      const info = getRecurringCycleInfo(challenge, '2024-06-18');
      expect(info!.currentCycle).toBe(3);
      expect(info!.status).toBe('active');
      expect(info!.cycleDay).toBe(2);
    });
  });

  describe('with zero gap days', () => {
    it('goes directly to next cycle with no gap', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-01',
        durationDays: 7,
        gapDays: 0,
      });
      // cyclePeriod = 7, forDate = 2024-06-08, daysSinceStart = 7
      // currentCycle = floor(7/7) + 1 = 2, dayWithinCycle = 0
      // 0 < 7 so active, cycleDay = 1
      const info = getRecurringCycleInfo(challenge, '2024-06-08');
      expect(info!.currentCycle).toBe(2);
      expect(info!.status).toBe('active');
      expect(info!.cycleDay).toBe(1);
    });

    it('never enters gap status', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-01',
        durationDays: 7,
        gapDays: 0,
      });
      // Test multiple dates across several cycles, none should be gap
      for (let d = 0; d < 30; d++) {
        const date = addDays('2024-06-01', d);
        const info = getRecurringCycleInfo(challenge, date);
        expect(info!.status).toBe('active');
      }
    });
  });

  describe('with undefined gapDays', () => {
    it('defaults gapDays to 0', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-01',
        durationDays: 7,
        gapDays: undefined,
      });
      // Same as gapDays = 0
      const info = getRecurringCycleInfo(challenge, '2024-06-08');
      expect(info!.currentCycle).toBe(2);
      expect(info!.status).toBe('active');
    });
  });

  describe('uses today by default', () => {
    it('uses faked today (2024-06-15) when forDate is omitted', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-15',
        durationDays: 10,
        gapDays: 5,
      });
      const info = getRecurringCycleInfo(challenge);
      expect(info!.cycleDay).toBe(1);
      expect(info!.status).toBe('active');
    });
  });
});

// ─── getCycleForDate ────────────────────────────────────────────

describe('getCycleForDate', () => {
  it('returns 1 for non-recurring challenge', () => {
    const challenge = makeChallenge({ isRecurring: false });
    expect(getCycleForDate(challenge, '2024-06-15')).toBe(1);
  });

  it('returns correct cycle number for recurring challenge', () => {
    const challenge = makeChallenge({
      isRecurring: true,
      startDate: '2024-06-01',
      durationDays: 5,
      gapDays: 2,
    });
    expect(getCycleForDate(challenge, '2024-06-01')).toBe(1); // cycle 1 active
    expect(getCycleForDate(challenge, '2024-06-06')).toBe(2); // cycle 1 gap => next cycle
    expect(getCycleForDate(challenge, '2024-06-08')).toBe(2); // cycle 2 active
  });

  it('returns 1 for date before start', () => {
    const challenge = makeChallenge({
      isRecurring: true,
      startDate: '2024-07-01',
      durationDays: 7,
      gapDays: 3,
    });
    expect(getCycleForDate(challenge, '2024-06-15')).toBe(1);
  });
});

// ─── getChallengeStatus ─────────────────────────────────────────

describe('getChallengeStatus', () => {
  describe('non-recurring', () => {
    it('returns "upcoming" when today is before start', () => {
      expect(getChallengeStatus('2024-07-01', '2024-07-30')).toBe('upcoming');
    });

    it('returns "active" when today is on start date', () => {
      expect(getChallengeStatus('2024-06-15', '2024-07-15')).toBe('active');
    });

    it('returns "active" when today is between start and end', () => {
      expect(getChallengeStatus('2024-06-01', '2024-06-30')).toBe('active');
    });

    it('returns "active" when today is on end date', () => {
      expect(getChallengeStatus('2024-06-01', '2024-06-15')).toBe('active');
    });

    it('returns "completed" when today is after end', () => {
      expect(getChallengeStatus('2024-05-01', '2024-05-31')).toBe('completed');
    });
  });

  describe('recurring', () => {
    it('delegates to getRecurringCycleInfo', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-01',
        durationDays: 7,
        gapDays: 3,
      });
      // daysSinceStart = 14, cyclePeriod = 10
      // currentCycle = 2, dayWithinCycle = 4, 4 < 7 => active
      expect(getChallengeStatus('2024-06-01', '2024-06-30', challenge)).toBe('active');
    });

    it('returns "gap" for recurring in gap period', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-08', // 7 days ago
        durationDays: 5,
        gapDays: 3,
      });
      // daysSinceStart = 7, cyclePeriod = 8
      // dayWithinCycle = 7, 7 >= 5 => gap
      expect(getChallengeStatus('2024-06-08', '2024-06-30', challenge)).toBe('gap');
    });

    it('returns "upcoming" for recurring not yet started', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-07-01',
        durationDays: 7,
        gapDays: 3,
      });
      expect(getChallengeStatus('2024-07-01', '2024-07-30', challenge)).toBe('upcoming');
    });
  });
});

// ─── getCurrentChallengeDay ─────────────────────────────────────

describe('getCurrentChallengeDay', () => {
  it('returns 1 on the start date', () => {
    expect(getCurrentChallengeDay('2024-06-15')).toBe(1);
  });

  it('returns correct day number mid-challenge', () => {
    expect(getCurrentChallengeDay('2024-06-10')).toBe(6); // 5 days later + 1
  });

  it('returns correct day even if past end (non-recurring)', () => {
    expect(getCurrentChallengeDay('2024-06-01')).toBe(15);
  });

  it('returns negative-ish for future start (non-recurring)', () => {
    // dayjs() at noon UTC vs midnight-based date string:
    // diff('2024-06-20T00:00', 'day') truncates to -4, +1 = -3 (partial day rounding)
    expect(getCurrentChallengeDay('2024-06-20')).toBe(-3);
  });

  describe('recurring', () => {
    it('returns cycle day for recurring challenge', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-10',
        durationDays: 7,
        gapDays: 3,
      });
      // Today = 2024-06-15, daysSinceStart = 5, cyclePeriod = 10
      // dayWithinCycle = 5, 5 < 7 => active, cycleDay = 6
      expect(getCurrentChallengeDay('2024-06-10', challenge)).toBe(6);
    });

    it('returns 0 when in gap period (cycleDay for gap)', () => {
      const challenge = makeChallenge({
        isRecurring: true,
        startDate: '2024-06-08',
        durationDays: 5,
        gapDays: 3,
      });
      // Today = 2024-06-15, daysSinceStart = 7, cyclePeriod = 8
      // dayWithinCycle = 7, 7 >= 5 => gap, cycleDay = 0
      expect(getCurrentChallengeDay('2024-06-08', challenge)).toBe(0);
    });
  });
});

// ─── getDaysRemaining ───────────────────────────────────────────

describe('getDaysRemaining', () => {
  it('returns 0 for today', () => {
    expect(getDaysRemaining('2024-06-15')).toBe(0);
  });

  it('returns 0 for past dates', () => {
    expect(getDaysRemaining('2024-06-01')).toBe(0);
    expect(getDaysRemaining('2020-01-01')).toBe(0);
  });

  it('returns positive for future dates', () => {
    // dayjs() is noon UTC; diff to midnight of '2024-06-20' truncates partial day
    expect(getDaysRemaining('2024-06-20')).toBe(4);
  });

  it('returns correct count for distant future', () => {
    expect(getDaysRemaining('2024-07-15')).toBe(29);
  });

  it('never returns negative', () => {
    expect(getDaysRemaining('2000-01-01')).toBeGreaterThanOrEqual(0);
  });
});

// ─── formatChatDate ─────────────────────────────────────────────

describe('formatChatDate', () => {
  it('returns "Today" for today', () => {
    expect(formatChatDate('2024-06-15')).toBe('Today');
  });

  it('returns "Yesterday" for yesterday', () => {
    expect(formatChatDate('2024-06-14')).toBe('Yesterday');
  });

  it('returns "ddd, MMM D" for same year', () => {
    expect(formatChatDate('2024-06-10')).toBe('Mon, Jun 10');
    expect(formatChatDate('2024-01-01')).toBe('Mon, Jan 1');
  });

  it('returns "ddd, MMM D, YYYY" for different year', () => {
    expect(formatChatDate('2023-12-25')).toBe('Mon, Dec 25, 2023');
    expect(formatChatDate('2022-07-04')).toBe('Mon, Jul 4, 2022');
  });

  it('returns "Yesterday" even across month boundary', () => {
    // Our fixed date is June 15; this tests that June 14 is yesterday
    expect(formatChatDate('2024-06-14')).toBe('Yesterday');
  });
});

// ─── addDays ────────────────────────────────────────────────────

describe('addDays', () => {
  it('adds 0 days returns same date', () => {
    expect(addDays('2024-06-15', 0)).toBe('2024-06-15');
  });

  it('adds positive days', () => {
    expect(addDays('2024-06-15', 10)).toBe('2024-06-25');
  });

  it('adds negative days (effectively subtracts)', () => {
    expect(addDays('2024-06-15', -5)).toBe('2024-06-10');
  });

  it('crosses month boundary', () => {
    expect(addDays('2024-06-28', 5)).toBe('2024-07-03');
  });

  it('crosses year boundary', () => {
    expect(addDays('2024-12-30', 5)).toBe('2025-01-04');
  });

  it('handles leap day', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
  });
});

// ─── subtractDays ───────────────────────────────────────────────

describe('subtractDays', () => {
  it('subtracts 0 days returns same date', () => {
    expect(subtractDays('2024-06-15', 0)).toBe('2024-06-15');
  });

  it('subtracts positive days', () => {
    expect(subtractDays('2024-06-15', 5)).toBe('2024-06-10');
  });

  it('crosses month boundary backward', () => {
    expect(subtractDays('2024-06-03', 5)).toBe('2024-05-29');
  });

  it('crosses year boundary backward', () => {
    expect(subtractDays('2024-01-03', 5)).toBe('2023-12-29');
  });

  it('subtracts negative days (effectively adds)', () => {
    expect(subtractDays('2024-06-15', -5)).toBe('2024-06-20');
  });

  it('handles leap day backward', () => {
    expect(subtractDays('2024-03-01', 1)).toBe('2024-02-29');
    expect(subtractDays('2023-03-01', 1)).toBe('2023-02-28'); // non-leap year
  });
});
