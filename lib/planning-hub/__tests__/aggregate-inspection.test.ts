import { describe, expect, it } from "vitest";
import {
  computeAggregateInspectionMetrics,
  computeAggregateTimeWindow,
  defaultAggregateSelectionId,
  filterAggregateInspectionItems,
  itemInspectionDressingLabel,
  itemInspectionPitchLabel,
} from "../aggregate-inspection";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

function baseItem(partial: Partial<WeekplannerItem> & Pick<WeekplannerItem, "id" | "type">): WeekplannerItem {
  return {
    tenantId: "t1",
    startAt: new Date("2026-09-16T16:45:00.000Z"),
    endAt: new Date("2026-09-16T18:15:00.000Z"),
    canonicalStartAt: new Date("2026-09-16T16:45:00.000Z"),
    canonicalEndAt: new Date("2026-09-16T18:15:00.000Z"),
    timeOverridden: false,
    title: "Activity",
    teamNames: [],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    ...partial,
  } as WeekplannerItem;
}

describe("aggregate-inspection", () => {
  it("computes aggregate time window from earliest start and latest end", () => {
    const items = [
      baseItem({
        id: "a",
        type: "TRAINING",
        startAt: new Date("2026-09-16T17:15:00.000Z"),
        endAt: new Date("2026-09-16T18:45:00.000Z"),
      }),
      baseItem({
        id: "b",
        type: "TRAINING",
        startAt: new Date("2026-09-16T16:45:00.000Z"),
        endAt: new Date("2026-09-16T19:45:00.000Z"),
      }),
    ];
    const window = computeAggregateTimeWindow(items);
    expect(window?.startAt.toISOString()).toBe("2026-09-16T16:45:00.000Z");
    expect(window?.endAt.toISOString()).toBe("2026-09-16T19:45:00.000Z");
  });

  it("metrics count trainings, conflicts, facilities, and dressing rooms", () => {
    const items = [
      baseItem({
        id: "t1",
        type: "TRAINING",
        teamNames: ["A"],
        pitchAllocations: [
          {
            facilityResourceId: "p1",
            facilityId: "f",
            code: "P1",
            name: "Platz 1",
            facilityName: "Anlage",
            occupancyBeforeMinutes: 0,
            occupancyAfterMinutes: 0,
          },
        ],
        dressingRoomAllocations: [
          {
            facilityResourceId: "d1",
            facilityId: "f",
            code: "E1",
            name: "E1",
            facilityName: "G",
            occupancyBeforeMinutes: 0,
            occupancyAfterMinutes: 0,
          },
        ],
        conflicts: [{ facilityResourceId: "d1", facilityResourceName: "E1", resourceKind: "DRESSING_ROOM" }],
      }),
      baseItem({
        id: "m1",
        type: "MATCH",
        eventId: "e",
        opponentName: "X",
        homeAway: "HOME",
        awayDressingRoomAllocations: [],
      }),
    ];
    const metrics = computeAggregateInspectionMetrics(items);
    expect(metrics.activityCount).toBe(2);
    expect(metrics.trainingCount).toBe(1);
    expect(metrics.conflictActivityCount).toBe(1);
    expect(metrics.uniqueFacilityCount).toBe(1);
    expect(metrics.uniqueDressingRoomCount).toBe(1);
  });

  it("default selection prefers first conflicting activity chronologically among conflicts", () => {
    const items = [
      baseItem({
        id: "ok",
        type: "TRAINING",
        startAt: new Date("2026-09-16T16:00:00.000Z"),
      }),
      baseItem({
        id: "c2",
        type: "TRAINING",
        startAt: new Date("2026-09-16T18:00:00.000Z"),
        conflicts: [{ facilityResourceId: "p", facilityResourceName: "P" }],
      }),
      baseItem({
        id: "c1",
        type: "TRAINING",
        startAt: new Date("2026-09-16T17:00:00.000Z"),
        conflicts: [{ facilityResourceId: "p", facilityResourceName: "P" }],
      }),
    ];
    expect(defaultAggregateSelectionId(items)).toBe("c1");
  });

  it("filters conflicts only and search locally", () => {
    const items = [
      baseItem({ id: "a", type: "TRAINING", teamNames: ["Junioren B1"], title: "Training B1" }),
      baseItem({
        id: "b",
        type: "TRAINING",
        teamNames: ["Junioren C1"],
        conflicts: [{ facilityResourceId: "x", facilityResourceName: "Kunstrasen 2 A" }],
      }),
    ];
    const conflictsOnly = filterAggregateInspectionItems(items, {
      query: "",
      conflictsOnly: true,
      sortKey: "start-asc",
    });
    expect(conflictsOnly.map((i) => i.id)).toEqual(["b"]);

    const searched = filterAggregateInspectionItems(items, {
      query: "kunstrasen",
      conflictsOnly: false,
      sortKey: "start-asc",
    });
    expect(searched.map((i) => i.id)).toEqual(["b"]);
  });

  it("sorts by team name", () => {
    const items = [
      baseItem({ id: "b", type: "TRAINING", teamNames: ["Zebra"] }),
      baseItem({ id: "a", type: "TRAINING", teamNames: ["Alpha"] }),
    ];
    const sorted = filterAggregateInspectionItems(items, {
      query: "",
      conflictsOnly: false,
      sortKey: "team",
    });
    expect(sorted.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("returns em dash for missing pitch and dressing", () => {
    const item = baseItem({ id: "x", type: "TRAINING" });
    expect(itemInspectionPitchLabel(item)).toBe("—");
    expect(itemInspectionDressingLabel(item)).toBe("—");
  });
});
