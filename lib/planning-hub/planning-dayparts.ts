/**
 * PLANNING-HUB-02D — canonical Kalender daypart viewing windows (product-level, not tenant hours).
 */

import type { VisibleTimeRange } from "./scheduler/time-scale";

export type PlanningHubCalendarDaypart = "morgen" | "nachmittag" | "abend" | "spaet";

export type PlanningHubCalendarZeitParam = PlanningHubCalendarDaypart | "ganz";

export const PLANNING_HUB_DAYPART_ORDER: readonly PlanningHubCalendarDaypart[] = [
  "morgen",
  "nachmittag",
  "abend",
  "spaet",
];

const DAYPART_BOUNDS: Record<PlanningHubCalendarDaypart, { start: number; end: number }> = {
  morgen: { start: 8 * 60, end: 12 * 60 },
  nachmittag: { start: 12 * 60, end: 16 * 60 },
  abend: { start: 16 * 60, end: 20 * 60 },
  spaet: { start: 20 * 60, end: 24 * 60 },
};

export const DAYPART_WINDOW_MINUTES = 4 * 60;

export function isPlanningHubCalendarDaypart(value: string): value is PlanningHubCalendarDaypart {
  return (
    value === "morgen" ||
    value === "nachmittag" ||
    value === "abend" ||
    value === "spaet"
  );
}

export function parsePlanningHubCalendarZeitParam(
  raw: string | undefined,
): PlanningHubCalendarZeitParam | undefined {
  const value = raw?.trim().toLowerCase();
  if (!value) return undefined;
  if (value === "ganz") return "ganz";
  if (isPlanningHubCalendarDaypart(value)) return value;
  return undefined;
}

export function daypartVisibleRange(daypart: PlanningHubCalendarDaypart): VisibleTimeRange {
  const { start, end } = DAYPART_BOUNDS[daypart];
  return {
    startMinutes: start,
    endMinutes: end,
    totalMinutes: end - start,
  };
}

export function daypartLabelDe(daypart: PlanningHubCalendarDaypart): string {
  switch (daypart) {
    case "morgen":
      return "Morgen";
    case "nachmittag":
      return "Nachmittag";
    case "abend":
      return "Abend";
    case "spaet":
      return "Spät";
  }
}

export function daypartTimeLabelDe(daypart: PlanningHubCalendarDaypart): string {
  switch (daypart) {
    case "morgen":
      return "08–12";
    case "nachmittag":
      return "12–16";
    case "abend":
      return "16–20";
    case "spaet":
      return "20–00";
  }
}

export function daypartAccessibleLabelDe(daypart: PlanningHubCalendarDaypart): string {
  switch (daypart) {
    case "morgen":
      return "Morgen, 08:00 bis 12:00";
    case "nachmittag":
      return "Nachmittag, 12:00 bis 16:00";
    case "abend":
      return "Abend, 16:00 bis 20:00";
    case "spaet":
      return "Spät, 20:00 bis 00:00";
  }
}

/** Minutes from local midnight for `date` in `timeZone`. */
export function localMinutesFromMidnight(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function defaultDaypartForLocalTime(
  date: Date,
  timeZone: string,
): PlanningHubCalendarDaypart {
  const minutes = localMinutesFromMidnight(date, timeZone);
  if (minutes < 8 * 60) return "morgen";
  if (minutes < 12 * 60) return "morgen";
  if (minutes < 16 * 60) return "nachmittag";
  if (minutes < 20 * 60) return "abend";
  return "spaet";
}

export function normalizeInvalidCalendarZeit(
  raw: string | undefined,
  now: Date,
  timeZone: string,
): PlanningHubCalendarZeitParam | undefined {
  const parsed = parsePlanningHubCalendarZeitParam(raw);
  if (parsed) return parsed;
  if (raw?.trim()) {
    return defaultDaypartForLocalTime(now, timeZone);
  }
  return undefined;
}

export type ResolvedCalendarViewport =
  | { mode: "daypart"; daypart: PlanningHubCalendarDaypart; explicit: boolean }
  | { mode: "full" };

export function resolveCalendarViewport(
  calendarZeit: PlanningHubCalendarZeitParam | undefined,
  now: Date,
  timeZone: string,
): ResolvedCalendarViewport {
  if (calendarZeit === "ganz") {
    return { mode: "full" };
  }
  if (calendarZeit && isPlanningHubCalendarDaypart(calendarZeit)) {
    return { mode: "daypart", daypart: calendarZeit, explicit: true };
  }
  return {
    mode: "daypart",
    daypart: defaultDaypartForLocalTime(now, timeZone),
    explicit: false,
  };
}
