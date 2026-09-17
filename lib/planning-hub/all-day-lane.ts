/**
 * SCE-EVENTS-01 — compact all-day lane layout for Planning Hub calendar.
 */

import { allDayInclusiveDayKeys } from "@/lib/events/club-event-scheduling";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import { filterWeekplannerItem } from "@/lib/planning-hub/filters";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";

export type AllDayLaneSegment = {
  item: WeekplannerItem & { type: "VERANSTALTUNG"; allDay: true };
  startDayIndex: number;
  spanDays: number;
  lane: number;
};

export function isAllDayVeranstaltung(
  item: WeekplannerItem,
): item is WeekplannerItem & { type: "VERANSTALTUNG"; allDay: true } {
  return item.type === "VERANSTALTUNG" && item.allDay;
}

export function isTimedCalendarItem(item: WeekplannerItem): boolean {
  return !isAllDayVeranstaltung(item);
}

export function collectAllDayLaneSegments(
  week: WeekplannerWeek,
  urlState: Pick<PlanningHubUrlState, "activity" | "team" | "facility" | "conflictsOnly">,
  timeZone: string,
): AllDayLaneSegment[] {
  const seen = new Map<string, WeekplannerItem & { type: "VERANSTALTUNG"; allDay: true }>();

  for (const day of week.days) {
    for (const item of day.items) {
      if (!isAllDayVeranstaltung(item)) continue;
      if (!filterWeekplannerItem(item, urlState)) continue;
      if (!seen.has(item.id)) seen.set(item.id, item);
    }
  }

  const dayIndex = new Map(week.days.map((d, i) => [d.dayKey, i]));
  const segments: Omit<AllDayLaneSegment, "lane">[] = [];

  for (const item of seen.values()) {
    const keys = allDayInclusiveDayKeys(item.startAt, item.endAt, timeZone);
    const indices = keys
      .map((key) => dayIndex.get(key))
      .filter((i): i is number => i !== undefined)
      .sort((a, b) => a - b);

    if (indices.length === 0) continue;

    let runStart = indices[0];
    let runEnd = indices[0];
    for (let i = 1; i < indices.length; i += 1) {
      if (indices[i] === runEnd + 1) {
        runEnd = indices[i];
      } else {
        segments.push({
          item,
          startDayIndex: runStart,
          spanDays: runEnd - runStart + 1,
        });
        runStart = indices[i];
        runEnd = indices[i];
      }
    }
    segments.push({
      item,
      startDayIndex: runStart,
      spanDays: runEnd - runStart + 1,
    });
  }

  segments.sort((a, b) => {
    if (a.startDayIndex !== b.startDayIndex) return a.startDayIndex - b.startDayIndex;
    return a.item.title.localeCompare(b.item.title, "de-CH");
  });

  const laneEnds: number[] = [];
  const placed: AllDayLaneSegment[] = [];

  for (const segment of segments) {
    const endIndex = segment.startDayIndex + segment.spanDays - 1;
    let lane = 0;
    for (; lane < laneEnds.length; lane += 1) {
      if (laneEnds[lane] < segment.startDayIndex) break;
    }
    if (lane === laneEnds.length) laneEnds.push(endIndex);
    else laneEnds[lane] = endIndex;

    placed.push({ ...segment, lane });
  }

  return placed;
}

export function allDayLaneRowCount(segments: readonly AllDayLaneSegment[]): number {
  if (segments.length === 0) return 0;
  return Math.max(...segments.map((s) => s.lane)) + 1;
}
