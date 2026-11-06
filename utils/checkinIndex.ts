import type { HabitCheckin } from '../types';

export function indexCheckinsByUser(checkins: HabitCheckin[]): Map<string, string[]> {
  const dates = new Map<string, string[]>();
  for (const checkin of checkins) {
    const userDates = dates.get(checkin.userId) || [];
    userDates.push(checkin.checkinDate);
    dates.set(checkin.userId, userDates);
  }
  return dates;
}
