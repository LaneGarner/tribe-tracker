import dayjs from 'dayjs';

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

// Calculate challenge status based on dates
export function getChallengeStatus(
  startDate: string,
  endDate: string
): 'upcoming' | 'active' | 'completed' {
  const today = getToday();
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const now = dayjs(today);

  if (now.isBefore(start)) return 'upcoming';
  if (now.isAfter(end)) return 'completed';
  return 'active';
}

// Get the current day number of a challenge (1-indexed)
export function getCurrentChallengeDay(startDate: string): number {
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

// Add days to a date
export function addDays(date: string, days: number): string {
  return dayjs(date).add(days, 'day').format('YYYY-MM-DD');
}

// Subtract days from a date
export function subtractDays(date: string, days: number): string {
  return dayjs(date).subtract(days, 'day').format('YYYY-MM-DD');
}
