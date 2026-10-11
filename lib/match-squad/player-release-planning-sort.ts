/**
 * Pure sorting / grouping helpers for release planning UI (client-safe).
 */

type PlanningActivityRow = { startAt: string };
type PlanningTargetTeamRow = { activities: PlanningActivityRow[] };

export function formatPlanningDateParts(startAt: Date, timezone: string): {
  dateGroupKey: string;
  dateLine: string;
  timeLine: string;
} {
  const dateGroupKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(startAt);
  const dateLine = new Intl.DateTimeFormat("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
  }).format(startAt);
  const timeLine = new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(startAt);
  return { dateGroupKey, dateLine, timeLine };
}

function parseDateGroupKeyToUtcMs(key: string): number {
  const [year, month, day] = key.split("-").map((part) => Number(part));
  return Date.UTC(year, month - 1, day);
}

function calendarDayDistance(
  activityStart: Date,
  sourceStart: Date,
  timezone: string,
): number {
  const activityKey = formatPlanningDateParts(activityStart, timezone).dateGroupKey;
  const sourceKey = formatPlanningDateParts(sourceStart, timezone).dateGroupKey;
  const diffMs = Math.abs(parseDateGroupKeyToUtcMs(activityKey) - parseDateGroupKeyToUtcMs(sourceKey));
  return Math.round(diffMs / 86400000);
}

function isPrimaryProximity(activityStart: Date, sourceStart: Date | null, timezone: string): boolean {
  if (!sourceStart) return true;
  return calendarDayDistance(activityStart, sourceStart, timezone) <= 7;
}

export function activitySortKey(
  activityStart: Date,
  sourceStart: Date | null,
  timezone: string,
): [number, number] {
  if (!sourceStart) {
    return [Number.MAX_SAFE_INTEGER, activityStart.getTime()];
  }
  const dayDistance = calendarDayDistance(activityStart, sourceStart, timezone);
  let tier = 4;
  if (dayDistance === 0) tier = 0;
  else if (dayDistance === 1) tier = 1;
  else if (dayDistance <= 3) tier = 2;
  else if (dayDistance <= 7) tier = 3;
  return [tier, activityStart.getTime()];
}

export function partitionTargetTeamActivities<T extends PlanningActivityRow>(
  team: PlanningTargetTeamRow & { activities: T[] },
  sourceStartAt: Date | null,
  timezone: string,
): {
  primary: T[];
  more: T[];
} {
  if (!sourceStartAt) {
    return { primary: team.activities, more: [] };
  }
  const primary: T[] = [];
  const more: T[] = [];
  for (const activity of team.activities) {
    if (isPrimaryProximity(new Date(activity.startAt), sourceStartAt, timezone)) {
      primary.push(activity);
    } else {
      more.push(activity);
    }
  }
  return { primary, more };
}
