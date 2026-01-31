import { getToday, subtractDays } from './dateUtils';

/**
 * Calculate the active streak from a list of check-in dates.
 * Counts consecutive days working backwards from today.
 * Returns 0 if user has not checked in today.
 *
 * @param checkinDates - Array of date strings in YYYY-MM-DD format
 * @param today - Optional today date for testing (defaults to actual today)
 * @returns Number of consecutive days including today (0 if no checkin today)
 */
export function calculateActiveStreak(
  checkinDates: string[],
  today?: string
): number {
  if (checkinDates.length === 0) return 0;

  const todayDate = today || getToday();
  const sortedDates = [...new Set(checkinDates)].sort().reverse();

  // Must have checked in today for streak to count
  if (sortedDates[0] !== todayDate) {
    return 0;
  }

  let streak = 1; // We know today is checked in

  for (let i = 1; i < sortedDates.length; i++) {
    const expectedDate = subtractDays(todayDate, i);

    if (sortedDates[i] === expectedDate) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
