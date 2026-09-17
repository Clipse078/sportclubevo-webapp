import { describe, expect, it } from "vitest";
import {
  collectAllDayLaneSegments,
  isTimedCalendarItem,
} from "@/lib/planning-hub/all-day-lane";
import { buildWeekplannerWeek } from "@/lib/weekplanner/view-model";
import type { WeekplannerVeranstaltungItem } from "@/lib/weekplanner/types";
import { zonedTimeToUtc } from "@/lib/training/recurrence";

const TZ = "Europe/Zurich";
const WEEK_DAYS = [
  "2026-09-21",
  "2026-09-22",
  "2026-09-23",
  "2026-09-24",
  "2026-09-25",
  "2026-09-26",
  "2026-09-27",
];

function veranstaltung(
  id: string,
  partial: Partial<WeekplannerVeranstaltungItem> & Pick<WeekplannerVeranstaltungItem, "startAt" | "endAt" | "allDay">,
): WeekplannerVeranstaltungItem {
  return {
    id: `veranstaltung:${id}`,
    tenantId: "tenant-1",
    type: "VERANSTALTUNG",
    title: partial.title ?? id,
    teamNames: [],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    eventId: id,
    location: null,
    teamSeasonId: null,
    canonicalStartAt: partial.startAt,
    canonicalEndAt: partial.endAt,
    timeOverridden: false,
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    ...partial,
  };
}

describe("SCE-EVENTS-01 all-day lane", () => {
  it("excludes all-day items from timed calendar grid", () => {
    const allDay = veranstaltung("fest", {
      allDay: true,
      startAt: zonedTimeToUtc("2026-09-25", "00:00", TZ),
      endAt: zonedTimeToUtc("2026-09-26", "00:00", TZ),
    });
    expect(isTimedCalendarItem(allDay)).toBe(false);
  });

  it("places multi-day all-day segment across columns", () => {
    const item = veranstaltung("lager", {
      allDay: true,
      title: "Trainingslager",
      startAt: zonedTimeToUtc("2026-09-25", "00:00", TZ),
      endAt: zonedTimeToUtc("2026-09-28", "00:00", TZ),
    });
    const week = buildWeekplannerWeek({
      items: [item],
      days: WEEK_DAYS,
      weekNumberLabel: "KW 39",
      rangeLabel: "range",
      param: "2026-09-21",
      previousParam: "prev",
      nextParam: "next",
      timeZone: TZ,
    });

    const segments = collectAllDayLaneSegments(
      week,
      { activity: "veranstaltungen", team: null, facility: null, conflictsOnly: false },
      TZ,
    );
    expect(segments).toHaveLength(1);
    expect(segments[0]?.spanDays).toBe(3);
    expect(segments[0]?.startDayIndex).toBe(4);
  });

  it("hides all-day events when Veranstaltungen filter is off", () => {
    const item = veranstaltung("fest", {
      allDay: true,
      startAt: zonedTimeToUtc("2026-09-25", "00:00", TZ),
      endAt: zonedTimeToUtc("2026-09-26", "00:00", TZ),
    });
    const week = buildWeekplannerWeek({
      items: [item],
      days: WEEK_DAYS,
      weekNumberLabel: "KW 39",
      rangeLabel: "range",
      param: "2026-09-21",
      previousParam: "prev",
      nextParam: "next",
      timeZone: TZ,
    });
    const hidden = collectAllDayLaneSegments(
      week,
      { activity: "trainings", team: null, facility: null, conflictsOnly: false },
      TZ,
    );
    expect(hidden).toHaveLength(0);
  });
});
