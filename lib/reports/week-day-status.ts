import { getWeekStart } from "@/lib/dates/week";

export type WeekDayDotStatus = "filled" | "missed" | "future" | "today";

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekDayStatuses(
  weekStart: string,
  today: string,
  filledDates: Iterable<string>,
): WeekDayDotStatus[] {
  const filled = new Set(filledDates);
  const statuses: WeekDayDotStatus[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    if (date > today) {
      statuses.push("future");
    } else if (filled.has(date)) {
      statuses.push("filled");
    } else if (date === today) {
      statuses.push("today");
    } else {
      statuses.push("missed");
    }
  }

  return statuses;
}

export function getLocalToday(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getCurrentWeekStart(timezone: string): string {
  return getWeekStart(new Date(), timezone);
}
