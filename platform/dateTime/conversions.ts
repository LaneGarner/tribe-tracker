function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateValue(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function formatTimeValue(value: Date): string {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function dateWithValue(current: Date, dateValue: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const next = new Date(current);
  next.setFullYear(year, month, day);
  if (
    Number.isNaN(next.getTime()) ||
    next.getFullYear() !== year ||
    next.getMonth() !== month ||
    next.getDate() !== day
  ) {
    return null;
  }
  return next;
}

export function timeWithValue(current: Date, timeValue: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(timeValue);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const next = new Date(current);
  next.setHours(hour, minute, 0, 0);
  return next;
}
