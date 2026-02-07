export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

type DateTimeParts = DateParts & {
  hour?: number;
  minute?: number;
  second?: number;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

export function normalizeTimeZone(timeZone?: string | null) {
  return timeZone && timeZone.trim().length > 0 ? timeZone : DEFAULT_TIMEZONE;
}

export function getZonedDateParts(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "1");
  return { year, month, day };
}

export function getZonedDateKey(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function getLocalDateParts(date: Date): DateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function getLocalDateKey(date: Date) {
  const parts = getLocalDateParts(date);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function getWeekdayFromParts(parts: DateParts) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return date.getUTCDay();
}

export function addDaysToParts(parts: DateParts, days: number): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + days);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(date);
    const tz = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
    const match = tz.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (!match) return 0;
    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] ?? "0");
    return sign * (hours * 60 + minutes);
  } catch {
    return 0;
  }
}

export function zonedTimeToUtc(parts: DateTimeParts, timeZone: string) {
  const hour = parts.hour ?? 0;
  const minute = parts.minute ?? 0;
  const second = parts.second ?? 0;
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, second);
  const firstOffset = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
  let utcMs = utcGuess - firstOffset * 60_000;
  const revisedOffset = getTimeZoneOffsetMinutes(new Date(utcMs), timeZone);
  if (revisedOffset !== firstOffset) {
    utcMs = utcGuess - revisedOffset * 60_000;
  }
  return new Date(utcMs);
}

export function parseDateTimeLocal(value: string): DateTimeParts | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

export function buildDateTimeLocal(parts: DateParts, hour: number, minute: number) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(hour)}:${pad2(minute)}`;
}

export function formatTimeInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTimeInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function getZonedHour(date: Date, timeZone: string) {
  const value = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return Number(value);
}

export function isSameZonedDay(left: Date, right: Date, timeZone: string) {
  return getZonedDateKey(left, timeZone) === getZonedDateKey(right, timeZone);
}
