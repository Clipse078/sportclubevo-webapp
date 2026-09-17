import { describe, expect, it } from "vitest";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import { weekplannerTimingDetail } from "@/lib/planning-hub/item-presenters";
import { buildWeekplannerWeek } from "@/lib/weekplanner/view-model";
import type { WeekplannerVeranstaltungItem } from "@/lib/weekplanner/types";
import { zonedTimeToUtc } from "@/lib/training/recurrence";

const TZ = "Europe/Zurich";

function v(
  id: string,
  partial: Partial<WeekplannerVeranstaltungItem> & Pick<WeekplannerVeranstaltungItem, "startAt" | "endAt" | "allDay">,
): WeekplannerVeranstaltungItem {
  return {
    id: `veranstaltung:${id}`,
    tenantId: "t1",
    type: "VERANSTALTUNG",
    title: id,
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

describe("SCE-EVENTS-01 planning hub integration", () => {
  const days = ["2026-09-25", "2026-09-26", "2026-09-27"];

  it("shows timed and all-day with Veranstaltungen filter", () => {
    const timed = v("timed", {
      allDay: false,
      startAt: zonedTimeToUtc("2026-09-25", "19:00", TZ),
      endAt: zonedTimeToUtc("2026-09-25", "21:00", TZ),
    });
    const allDay = v("fest", {
      allDay: true,
      startAt: zonedTimeToUtc("2026-09-26", "00:00", TZ),
      endAt: zonedTimeToUtc("2026-09-27", "00:00", TZ),
    });
    const week = buildWeekplannerWeek({
      items: [timed, allDay],
      days,
      weekNumberLabel: "KW",
      rangeLabel: "r",
      param: "p",
      previousParam: "a",
      nextParam: "b",
      timeZone: TZ,
    });
    const filtered = applyPlanningHubFilters(week, {
      activity: "veranstaltungen",
      team: null,
      facility: null,
      conflictsOnly: false,
    });
    const ids = filtered.days.flatMap((d) => d.items.map((i) => i.id));
    expect(ids).toContain(timed.id);
    expect(ids).toContain(allDay.id);
  });

  it("formats liste timing as Ganztägig without fake midnight range", () => {
    const allDay = v("fest", {
      allDay: true,
      startAt: zonedTimeToUtc("2026-09-25", "00:00", TZ),
      endAt: zonedTimeToUtc("2026-09-26", "00:00", TZ),
    });
    const label = weekplannerTimingDetail(allDay, "de-CH", TZ);
    expect(label).toBe("Ganztägig");
    expect(label).not.toMatch(/00:00/);
  });
});
