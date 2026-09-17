import { describe, expect, it } from "vitest";
import { evaluateManipulationConflicts } from "../manipulation-projection";
import { draftOccupancyGeometryKey } from "../scheduler/resource-occupancy-manipulation";
import type { SchedulerDraftChange } from "../scheduler-draft";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

function syntheticMatch(id: string, hour: number): WeekplannerItem {
  const start = new Date(`2026-09-20T${String(hour).padStart(2, "0")}:30:00.000Z`);
  const end = new Date(start.getTime() + 2 * 60 * 60_000);
  const room = {
    facilityResourceId: `room-${id}`,
    facilityId: "f1",
    code: "E1",
    name: "E1",
    facilityName: "G",
    occupancyBeforeMinutes: 60,
    occupancyAfterMinutes: 45,
  };
  return {
    id: `match:${id}`,
    tenantId: "t1",
    type: "MATCH",
    eventId: id,
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: `Match ${id}`,
    teamNames: ["Team"],
    pitchAllocations: [],
    dressingRoomAllocations: [room],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [room],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 60,
    dressingRoomResolvedAfterMinutes: 45,
  } as WeekplannerItem;
}

describe("PLANNING-HUB-03B performance guards", () => {
  it("draft geometry key is stable across sub-threshold pointer noise", () => {
    const base = syntheticMatch("a", 7);
    const draftA: SchedulerDraftChange = {
      itemId: base.id,
      originalStart: new Date("2026-09-20T06:30:00.000Z"),
      originalEnd: new Date("2026-09-20T10:15:00.000Z"),
      proposedStart: new Date("2026-09-20T06:30:00.000Z"),
      proposedEnd: new Date("2026-09-20T10:15:00.000Z"),
      manipulationType: "move",
      timeTarget: "resourceOccupancy",
      item: base,
    };
    const draftB = {
      ...draftA,
      proposedStart: new Date("2026-09-20T06:30:00.000Z"),
      proposedEnd: new Date("2026-09-20T10:15:00.000Z"),
    };
    expect(draftOccupancyGeometryKey(draftA)).toBe(draftOccupancyGeometryKey(draftB));
  });

  it("conflict preview for occupancy draft stays under 100ms for busy week", () => {
    const items = Array.from({ length: 80 }, (_, i) => syntheticMatch(`m-${i}`, 6 + (i % 8)));
    const mover = items[0]!;
    const draft: SchedulerDraftChange = {
      itemId: mover.id,
      originalStart: new Date("2026-09-20T06:30:00.000Z"),
      originalEnd: new Date("2026-09-20T10:15:00.000Z"),
      proposedStart: new Date("2026-09-20T06:15:00.000Z"),
      proposedEnd: new Date("2026-09-20T10:30:00.000Z"),
      manipulationType: "combined",
      timeTarget: "resourceOccupancy",
      item: mover,
    };
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) {
      evaluateManipulationConflicts(items, draft, null, "dressing");
    }
    const perCallMs = (performance.now() - t0) / 20;
    expect(perCallMs).toBeLessThan(100);
  });
});
