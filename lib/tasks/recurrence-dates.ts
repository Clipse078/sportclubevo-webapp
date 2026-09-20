import type { TaskRecurrenceFrequency, TaskSeriesWeekday } from "@prisma/client";

/** Bounded forward generation: 8 weeks for weekly, ~3 months for monthly. */
export const WEEKLY_GENERATION_HORIZON_DAYS = 56;
export const MONTHLY_GENERATION_HORIZON_DAYS = 93;

const WEEKDAY_TO_JS: Record<TaskSeriesWeekday, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 0,
};

export function buildSeriesOccurrenceKey(seriesId: string, localDateIso: string): string {
  return `${seriesId}:${localDateIso}`;
}

export function formatLocalDateIso(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getLocalWeekdayJs(localDateIso: string, timeZone: string): number {
  const noonUtc = localDateTimeToUtc(localDateIso, 12, 0, timeZone);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(noonUtc);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export function localDateTimeToUtc(
  localDateIso: string,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const probe = new Date(`${localDateIso}T12:00:00.000Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(probe);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const tzHour = Number(get("hour"));
  const tzMinute = Number(get("minute"));

  const baseUtc = new Date(
    `${localDateIso}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`,
  );
  const offsetMinutes = (tzHour - 12) * 60 + tzMinute;
  return new Date(baseUtc.getTime() - offsetMinutes * 60_000);
}

export function addDaysToLocalDateIso(localDateIso: string, days: number): string {
  const [y, m, d] = localDateIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function listWeeklyOccurrenceLocalDates(input: {
  weekday: TaskSeriesWeekday;
  intervalWeeks: number;
  timeZone: string;
  startsOn?: Date | null;
  endsOn?: Date | null;
  now?: Date;
  horizonDays?: number;
}): string[] {
  const now = input.now ?? new Date();
  const horizonDays = input.horizonDays ?? WEEKLY_GENERATION_HORIZON_DAYS;
  const targetJsDay = WEEKDAY_TO_JS[input.weekday];
  const matches: string[] = [];

  const cursor = new Date(now);
  cursor.setUTCHours(12, 0, 0, 0);

  for (let i = 0; i <= horizonDays; i++) {
    const localIso = formatLocalDateIso(cursor, input.timeZone);
    if (getLocalWeekdayJs(localIso, input.timeZone) === targetJsDay) {
      const startBoundary = input.startsOn
        ? formatLocalDateIso(input.startsOn, input.timeZone)
        : null;
      const endBoundary = input.endsOn
        ? formatLocalDateIso(input.endsOn, input.timeZone)
        : null;
      if (startBoundary && localIso < startBoundary) {
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        continue;
      }
      if (endBoundary && localIso > endBoundary) break;
      matches.push(localIso);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (input.intervalWeeks <= 1) return matches;

  const anchor = matches[0];
  if (!anchor) return [];

  return matches.filter((localIso, index) => {
    if (index === 0) return true;
    const weeksBetween = Math.round(
      (new Date(localIso).getTime() - new Date(anchor).getTime()) /
        (7 * 86_400_000),
    );
    return weeksBetween % input.intervalWeeks === 0;
  });
}

export function listMonthlyOccurrenceLocalDates(input: {
  monthDay: number;
  intervalMonths: number;
  timeZone: string;
  startsOn?: Date | null;
  endsOn?: Date | null;
  now?: Date;
  horizonDays?: number;
}): string[] {
  const day = Math.min(Math.max(input.monthDay, 1), 28);
  const now = input.now ?? new Date();
  const horizonDays = input.horizonDays ?? MONTHLY_GENERATION_HORIZON_DAYS;
  const horizonEnd = new Date(now.getTime() + horizonDays * 86_400_000);
  const dates: string[] = [];

  const start = new Date(now);
  start.setUTCDate(1);

  for (let i = 0; i < 24; i++) {
    const year = start.getUTCFullYear();
    const month = start.getUTCMonth();
    const localIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const occurrenceUtc = localDateTimeToUtc(localIso, 12, 0, input.timeZone);
    if (occurrenceUtc >= now && occurrenceUtc <= horizonEnd) {
      const startBoundary = input.startsOn
        ? formatLocalDateIso(input.startsOn, input.timeZone)
        : null;
      const endBoundary = input.endsOn
        ? formatLocalDateIso(input.endsOn, input.timeZone)
        : null;
      if (
        (!startBoundary || localIso >= startBoundary) &&
        (!endBoundary || localIso <= endBoundary)
      ) {
        dates.push(localIso);
      }
    }

    start.setUTCMonth(start.getUTCMonth() + input.intervalMonths);
    if (start > horizonEnd) break;
  }

  return dates;
}

export function listOccurrenceLocalDatesForSeries(series: {
  frequency: TaskRecurrenceFrequency;
  intervalCount: number;
  weekday: TaskSeriesWeekday | null;
  monthDay: number | null;
  timezone: string;
  startsOn: Date | null;
  endsOn: Date | null;
}): string[] {
  if (series.frequency === "WEEKLY") {
    if (!series.weekday) return [];
    return listWeeklyOccurrenceLocalDates({
      weekday: series.weekday,
      intervalWeeks: series.intervalCount,
      timeZone: series.timezone,
      startsOn: series.startsOn,
      endsOn: series.endsOn,
    });
  }

  if (!series.monthDay) return [];
  return listMonthlyOccurrenceLocalDates({
    monthDay: series.monthDay,
    intervalMonths: series.intervalCount,
    timeZone: series.timezone,
    startsOn: series.startsOn,
    endsOn: series.endsOn,
  });
}
