/**
 * lib/weekplanner/view-model.ts
 *
 * WEEKPLANNER-01A — pure aggregation over an already tenant-scoped,
 * already-filtered flat list of canonical WeekplannerItems: day-bucketing,
 * chronological ordering, and resource-conflict ("⚠ Doppelbelegung")
 * detection.
 *
 * WOCHENPLAN-2.0-01H-E2 — conflict detection uses effective resource
 * occupancy windows (event time + before/after buffers) via the shared
 * primitive in lib/facilities/resource-occupancy-window.ts.
 *
 * SCE-OPS-01C — canonical activity identity, pitch capacity hierarchy, and
 * enriched conflict metadata (see lib/weekplanner/conflict-detection.ts).
 *
 * Pure, synchronous, no I/O.
 */

import { allDayInclusiveDayKeys } from "@/lib/events/club-event-scheduling";
import { annotateWeekplannerConflicts } from "./conflict-detection";
import { zonedDateKey, WEEKPLANNER_DEFAULT_TIMEZONE } from "./date";
import type { WeekplannerDay, WeekplannerItem, WeekplannerWeek } from "./types";

export { annotateWeekplannerConflicts as detectWeekplannerConflicts };

function compareItems(a: WeekplannerItem, b: WeekplannerItem): number {
  const startDiff = a.startAt.getTime() - b.startAt.getTime();
  if (startDiff !== 0) return startDiff;
  return a.title.localeCompare(b.title, "de-CH");
}

/**
 * Builds the full Weekplanner week: buckets `items` into their Europe/Zurich
 * calendar day (one bucket per entry in `days`, always in that order, even
 * when empty), sorts each day chronologically, and annotates conflicts.
 */
export function buildWeekplannerWeek(input: {
  items: readonly WeekplannerItem[];
  days: readonly string[];
  weekNumberLabel: string;
  rangeLabel: string;
  param: string;
  previousParam: string;
  nextParam: string;
  timeZone?: string;
}): WeekplannerWeek {
  const timeZone = input.timeZone ?? WEEKPLANNER_DEFAULT_TIMEZONE;
  const annotated = annotateWeekplannerConflicts(input.items);

  const byDay = new Map<string, WeekplannerItem[]>();
  for (const item of annotated) {
    const dayKeys =
      item.type === "VERANSTALTUNG" && item.allDay
        ? allDayInclusiveDayKeys(item.startAt, item.endAt, timeZone)
        : [zonedDateKey(item.startAt, timeZone)];
    for (const dayKey of dayKeys) {
      const bucket = byDay.get(dayKey) ?? [];
      bucket.push(item);
      byDay.set(dayKey, bucket);
    }
  }

  const days: WeekplannerDay[] = input.days.map((dayKey) => ({
    dayKey,
    items: (byDay.get(dayKey) ?? []).sort(compareItems),
  }));

  return {
    days,
    weekNumberLabel: input.weekNumberLabel,
    rangeLabel: input.rangeLabel,
    param: input.param,
    previousParam: input.previousParam,
    nextParam: input.nextParam,
  };
}
