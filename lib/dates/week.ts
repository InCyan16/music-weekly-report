import {
  getLocalDateString,
  parseLocalDateToParts,
} from "@/lib/dates/timezone";

export function getWeekStart(date: Date, timezone: string): string {
  const parts = parseLocalDateToParts(date, timezone);
  const daysFromMonday = parts.weekday === 0 ? 6 : parts.weekday - 1;
  const monday = new Date(date);
  monday.setDate(monday.getDate() - daysFromMonday);
  return getLocalDateString(monday, timezone);
}

export function getWeekEnd(weekStart: string, timezone: string): string {
  const [year, month, day] = weekStart.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const sunday = new Date(start);
  sunday.setDate(sunday.getDate() + 6);
  return getLocalDateString(sunday, timezone);
}

export function getDaysUntilSunday(date: Date, timezone: string): number {
  const parts = parseLocalDateToParts(date, timezone);
  if (parts.weekday === 0) return 0;
  return 7 - parts.weekday;
}

export function isSunday(date: Date, timezone: string): boolean {
  const parts = parseLocalDateToParts(date, timezone);
  return parts.weekday === 0;
}

export function formatWeekRange(
  weekStart: string,
  weekEnd: string,
): string {
  const startParts = weekStart.split("-");
  const endParts = weekEnd.split("-");
  return `${startParts[1]}/${startParts[2]} – ${endParts[1]}/${endParts[2]}, ${endParts[0]}`;
}

export function getWeekId(weekStart: string): string {
  return weekStart;
}
