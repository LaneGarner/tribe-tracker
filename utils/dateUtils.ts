import dayjs from 'dayjs';
import { Challenge } from '../types';

// Get today's date as YYYY-MM-DD string
export function getToday(): string {
  return dayjs().format('YYYY-MM-DD');
}

// Get a date N days from today
export function getDaysFromNow(days: number): string {
  return dayjs().add(days, 'day').format('YYYY-MM-DD');
}

// Format a date for display
export function formatDate(date: string, format: string = 'MMM D, YYYY'): string {
  return dayjs(date).format(format);
}

// Format a date for display as relative (e.g., "Today", "Yesterday", "2 days ago")
export function formatRelativeDate(date: string): string {
  const now = dayjs();
  const target = dayjs(date);
  const diffDays = now.diff(target, 'day');

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return target.format('MMM D, YYYY');
}

// Check if a date is today
export function isToday(date: string): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

// Check if a date is in the past
export function isPast(date: string): boolean {
  return dayjs(date).isBefore(dayjs(), 'day');
}

// Check if a date is in the future
export function isFuture(date: string): boolean {
  return dayjs(date).isAfter(dayjs(), 'day');
}

// Get the number of days between two dates
export function getDaysBetween(startDate: string, endDate: string): number {
  return dayjs(endDate).diff(dayjs(startDate), 'day');
}

// Get the day of the week (0-6, Sunday-Saturday)
export function getDayOfWeek(date: string): number {
  return dayjs(date).day();
}

// Get all dates in a range (inclusive)
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = dayjs(startDate);
  const end = dayjs(endDate);

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    dates.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }

  return dates;
}

// Get the Monday of the current week
export function getMondayOfWeek(date: string = getToday()): string {
  const d = dayjs(date);
  const day = d.day();
  // If Sunday (0), go back 6 days; otherwise go back day-1 days
  const diff = day === 0 ? 6 : day - 1;
  return d.subtract(diff, 'day').format('YYYY-MM-DD');
}

// Get start and end of a challenge given start date and duration
export function getChallengeEndDate(startDate: string, durationDays: number): string {
  return dayjs(startDate).add(durationDays - 1, 'day').format('YYYY-MM-DD');
}

// Recurring challenge cycle info
export interface CycleInfo {
  currentCycle: number;
  cycleStartDate: string;
  cycleEndDate: string;
  status: 'upcoming' | 'active' | 'completed' | 'gap';
  cycleDay: number;
  cycleDaysRemaining: number;
}

// Compute cycle info for a recurring challenge at a given date (defaults to today)
export function getRecurringCycleInfo(
  challenge: Challenge,
  forDate?: string
): CycleInfo | null {
  if (!challenge.isRecurring) return null;

  const today = forDate || getToday();
  const start = dayjs(challenge.startDate);
  const now = dayjs(today);

  if (now.isBefore(start)) {
    return {
      currentCycle: 1,
      cycleStartDate: challenge.startDate,
      cycleEndDate: getChallengeEndDate(challenge.startDate, challenge.durationDays),
      status: 'upcoming',
      cycleDay: 0,
      cycleDaysRemaining: challenge.durationDays,
    };
  }

  const durationDays = challenge.durationDays;
  const gapDays = challenge.gapDays ?? 0;
  const cyclePeriod = durationDays + gapDays;
  const daysSinceStart = now.diff(start, 'day');
  const currentCycle = Math.floor(daysSinceStart / cyclePeriod) + 1;
  const dayWithinCycle = daysSinceStart % cyclePeriod;

  const cycleStartDate = start.add((currentCycle - 1) * cyclePeriod, 'day').format('YYYY-MM-DD');
  const cycleEndDate = getChallengeEndDate(cycleStartDate, durationDays);

  if (dayWithinCycle < durationDays) {
    return {
      currentCycle,
      cycleStartDate,
      cycleEndDate,
      status: 'active',
      cycleDay: dayWithinCycle + 1,
      cycleDaysRemaining: durationDays - dayWithinCycle - 1,
    };
  }

  // In gap period
  const gapDaysRemaining = cyclePeriod - dayWithinCycle - 1;
  const nextCycleStart = start.add(currentCycle * cyclePeriod, 'day').format('YYYY-MM-DD');
  return {
    currentCycle: currentCycle + 1,
    cycleStartDate: nextCycleStart,
    cycleEndDate: getChallengeEndDate(nextCycleStart, durationDays),
    status: 'gap',
    cycleDay: 0,
    cycleDaysRemaining: gapDaysRemaining,
  };
}

// Get the cycle number for a specific checkin date
export function getCycleForDate(challenge: Challenge, checkinDate: string): number {
  if (!challenge.isRecurring) return 1;
  const info = getRecurringCycleInfo(challenge, checkinDate);
  return info?.currentCycle ?? 1;
}

// Calculate challenge status based on dates
export function getChallengeStatus(
  startDate: string,
  endDate: string,
  challenge?: Challenge
): 'upcoming' | 'active' | 'completed' | 'gap' {
  if (challenge?.isRecurring) {
    const info = getRecurringCycleInfo(challenge);
    return info?.status ?? 'active';
  }

  const today = getToday();
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const now = dayjs(today);

  if (now.isBefore(start)) return 'upcoming';
  if (now.isAfter(end)) return 'completed';
  return 'active';
}

// Get the current day number of a challenge (1-indexed)
export function getCurrentChallengeDay(startDate: string, challenge?: Challenge): number {
  if (challenge?.isRecurring) {
    const info = getRecurringCycleInfo(challenge);
    return info?.cycleDay ?? 1;
  }
  const today = dayjs();
  const start = dayjs(startDate);
  return today.diff(start, 'day') + 1;
}

// Get days remaining until a date (0 if past or today)
export function getDaysRemaining(endDate: string): number {
  const end = dayjs(endDate);
  const today = dayjs();
  const diff = end.diff(today, 'day');
  return Math.max(0, diff);
}

// Format a date for chat date separators
export function formatChatDate(date: string): string {
  const now = dayjs();
  const target = dayjs(date);

  if (target.isSame(now, 'day')) return 'Today';
  if (target.isSame(now.subtract(1, 'day'), 'day')) return 'Yesterday';
  if (target.isSame(now, 'year')) return target.format('ddd, MMM D');
  return target.format('ddd, MMM D, YYYY');
}

// Add days to a date
export function addDays(date: string, days: number): string {
  return dayjs(date).add(days, 'day').format('YYYY-MM-DD');
}

// Subtract days from a date
export function subtractDays(date: string, days: number): string {
  return dayjs(date).subtract(days, 'day').format('YYYY-MM-DD');
}
