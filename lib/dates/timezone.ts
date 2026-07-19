const DEFAULT_TIMEZONE = "UTC";

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function formatInTimezone(
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    ...options,
  }).format(date);
}

export function getLocalDateString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseLocalDateToParts(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number; weekday: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0", 10);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value || "Mon";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    weekday: weekdayMap[weekdayStr] ?? 1,
  };
}

export function getTodayLocalDate(timezone: string): string {
  return getLocalDateString(new Date(), timezone);
}

export function localDateToDate(localDate: string, timezone: string): Date {
  // Parse YYYY-MM-DD as noon in the given timezone to avoid DST edge cases
  const [year, month, day] = localDate.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return utcDate;
}
