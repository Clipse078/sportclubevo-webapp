import { describe, expect, it } from "vitest";
import { buildPlanningConflictIncidents } from "../conflict-attention";
import type { WeekplannerMatchItem, WeekplannerWeek } from "@/lib/weekplanner/types";

const KR2: WeekplannerMatchItem["pitchAllocations"][number] = {
  facilityResourceId: "kr2",
  facilityId: "fac-2",
  code: "KR2",
  name: "Kunstrasen 2",
  facilityName: "Anlage",
  resourceType: "FULL_PITCH",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const KR3: WeekplannerMatchItem["pitchAllocations"][number] = {
  facilityResourceId: "kr3",
  facilityId: "fac-3",
  code: "KR3",
  name: "Kunstrasen 3",
  facilityName: "Anlage",
  resourceType: "FULL_PITCH",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

function match(id: string, eventId: string, pitch: typeof KR2, start: string, end: string): WeekplannerMatchItem {
  const startAt = new Date(start);
  const endAt = new Date(end);
  return {
    id,
    tenantId: "t1",
    type: "MATCH",
    startAt,
    endAt,
    canonicalStartAt: startAt,
    canonicalEndAt: endAt,
    timeOverridden: false,
    title: id,
    teamNames: ["Team"],
    opponentName: "Opponent",
    homeAway: "HOME",
    eventId,
    pitchAllocations: [pitch],
    dressingRoomAllocations: [],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [pitch],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
  };
}

function weekWith(items: WeekplannerMatchItem[]): WeekplannerWeek {
  return {
    days: [
      { dayKey: "2026-09-20", items },
      ...["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19"].map(
        (dayKey) => ({ dayKey, items: [] }),
      ),
    ],
    weekNumberLabel: "KW",
    rangeLabel: "range",
    param: "2026-09-14",
    previousParam: "2026-09-07",
    nextParam: "2026-09-21",
  };
}

describe("buildPlanningConflictIncidents — SCE-OPS-01C", () => {
  it("does not create incidents for the same canonical event twice", () => {
    const item = match(
      "match:a",
      "same",
      KR3,
      "2026-09-20T07:30:00.000Z",
      "2026-09-20T09:30:00.000Z",
    );
    const incidents = buildPlanningConflictIncidents(weekWith([item, { ...item, id: "match:b" }]));
    expect(incidents).toHaveLength(0);
  });

  it("does not cross-contaminate Kunstrasen 2 and Kunstrasen 3", () => {
    const onKr2 = match(
      "match:2",
      "e2",
      KR2,
      "2026-09-20T08:00:00.000Z",
      "2026-09-20T10:00:00.000Z",
    );
    const onKr3 = match(
      "match:3",
      "e3",
      KR3,
      "2026-09-20T08:00:00.000Z",
      "2026-09-20T10:00:00.000Z",
    );
    const incidents = buildPlanningConflictIncidents(weekWith([onKr2, onKr3]));
    expect(incidents).toHaveLength(0);
  });
});
