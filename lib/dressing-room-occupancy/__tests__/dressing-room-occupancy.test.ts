import { describe, expect, it } from "vitest";
import { PLATFORM_DRESSING_ROOM_OCCUPANCY_PRESETS } from "../defaults";
import { resolveDressingRoomOccupancy } from "../resolver";
import { MAX_DRESSING_ROOM_OCCUPANCY_MINUTES, validateDressingRoomOccupancyMinutes } from "../validation";
import { detectWeekplannerConflicts } from "@/lib/weekplanner/view-model";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { projectItemWithDraft } from "@/lib/planning-hub/manipulation-projection";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";

const presets = {
  training: { beforeMinutes: 30, afterMinutes: 30 },
  match: { beforeMinutes: 75, afterMinutes: 45 },
  tournament: { beforeMinutes: 60, afterMinutes: 60 },
};

function trainingItem(overrides: Partial<WeekplannerItem> = {}): WeekplannerItem {
  return {
    id: "training:a",
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date("2026-08-10T15:00:00.000Z"),
    endAt: new Date("2026-08-10T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-08-10T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-08-10T16:30:00.000Z"),
    timeOverridden: false,
    title: "T",
    teamNames: [],
    pitchAllocations: [],
    dressingRoomAllocations: [
      {
        facilityResourceId: "room-1",
        facilityId: "f1",
        code: "E1",
        name: "E1",
        facilityName: "G",
        occupancyBeforeMinutes: 30,
        occupancyAfterMinutes: 30,
      },
    ],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 30,
    dressingRoomResolvedAfterMinutes: 30,
    trainingSeriesId: "s",
    trainingSessionId: "sess",
    teamSeasonId: "ts",
    ...overrides,
  } as WeekplannerItem;
}

describe("resolveDressingRoomOccupancy", () => {
  it("resolves DEFAULT training from tenant preset", () => {
    const resolved = resolveDressingRoomOccupancy({
      activityType: "TRAINING",
      activityStart: new Date("2026-08-10T17:00:00.000Z"),
      activityEnd: new Date("2026-08-10T18:30:00.000Z"),
      tenantPresets: presets,
      eventOverride: { mode: "DEFAULT", beforeMinutes: null, afterMinutes: null },
    });
    expect(resolved.beforeMinutes).toBe(30);
    expect(resolved.afterMinutes).toBe(30);
    expect(resolved.effectiveStart.toISOString()).toBe("2026-08-10T16:30:00.000Z");
    expect(resolved.effectiveEnd.toISOString()).toBe("2026-08-10T19:00:00.000Z");
  });

  it("CUSTOM training overrides tenant preset", () => {
    const resolved = resolveDressingRoomOccupancy({
      activityType: "TRAINING",
      activityStart: new Date("2026-08-10T17:00:00.000Z"),
      activityEnd: new Date("2026-08-10T18:30:00.000Z"),
      tenantPresets: presets,
      eventOverride: { mode: "CUSTOM", beforeMinutes: 45, afterMinutes: 30 },
    });
    expect(resolved.beforeMinutes).toBe(45);
    expect(resolved.effectiveStart.toISOString()).toBe("2026-08-10T16:15:00.000Z");
  });

  it("DEFAULT responds to changed tenant preset", () => {
    const first = resolveDressingRoomOccupancy({
      activityType: "TRAINING",
      activityStart: new Date("2026-08-10T17:00:00.000Z"),
      activityEnd: new Date("2026-08-10T18:30:00.000Z"),
      tenantPresets: presets,
      eventOverride: { mode: "DEFAULT", beforeMinutes: null, afterMinutes: null },
    });
    const second = resolveDressingRoomOccupancy({
      activityType: "TRAINING",
      activityStart: new Date("2026-08-10T17:00:00.000Z"),
      activityEnd: new Date("2026-08-10T18:30:00.000Z"),
      tenantPresets: {
        ...presets,
        training: { beforeMinutes: 45, afterMinutes: 30 },
      },
      eventOverride: { mode: "DEFAULT", beforeMinutes: null, afterMinutes: null },
    });
    expect(first.beforeMinutes).toBe(30);
    expect(second.beforeMinutes).toBe(45);
  });

  it("CUSTOM does not respond to tenant preset change", () => {
    const resolved = resolveDressingRoomOccupancy({
      activityType: "TRAINING",
      activityStart: new Date("2026-08-10T17:00:00.000Z"),
      activityEnd: new Date("2026-08-10T18:30:00.000Z"),
      tenantPresets: { ...presets, training: { beforeMinutes: 99, afterMinutes: 99 } },
      eventOverride: { mode: "CUSTOM", beforeMinutes: 10, afterMinutes: 10 },
    });
    expect(resolved.beforeMinutes).toBe(10);
  });

  it("rejects negative values", () => {
    expect(() => validateDressingRoomOccupancyMinutes(-1, "x")).toThrow();
  });

  it("resolves DEFAULT match and tournament presets", () => {
    const match = resolveDressingRoomOccupancy({
      activityType: "MATCH",
      activityStart: new Date("2026-08-10T16:00:00.000Z"),
      activityEnd: new Date("2026-08-10T17:45:00.000Z"),
      tenantPresets: presets,
      eventOverride: { mode: "DEFAULT", beforeMinutes: null, afterMinutes: null },
    });
    expect(match.beforeMinutes).toBe(75);
    expect(match.afterMinutes).toBe(45);

    const tournament = resolveDressingRoomOccupancy({
      activityType: "TOURNAMENT",
      activityStart: new Date("2026-08-10T07:00:00.000Z"),
      activityEnd: new Date("2026-08-10T10:00:00.000Z"),
      tenantPresets: presets,
      eventOverride: { mode: "DEFAULT", beforeMinutes: null, afterMinutes: null },
    });
    expect(tournament.beforeMinutes).toBe(60);
    expect(tournament.afterMinutes).toBe(60);
  });

  it("supports zero before/after buffers", () => {
    const resolved = resolveDressingRoomOccupancy({
      activityType: "TRAINING",
      activityStart: new Date("2026-08-10T17:00:00.000Z"),
      activityEnd: new Date("2026-08-10T18:30:00.000Z"),
      tenantPresets: presets,
      eventOverride: { mode: "CUSTOM", beforeMinutes: 0, afterMinutes: 0 },
    });
    expect(resolved.effectiveStart.toISOString()).toBe("2026-08-10T17:00:00.000Z");
    expect(resolved.effectiveEnd.toISOString()).toBe("2026-08-10T18:30:00.000Z");
  });

  it("rejects excessive buffer values", () => {
    expect(() =>
      validateDressingRoomOccupancyMinutes(MAX_DRESSING_ROOM_OCCUPANCY_MINUTES + 1, "x"),
    ).toThrow();
  });
});

describe("conflict detection with dressing occupancy", () => {
  it("detects overlap from after-buffer even when nominal times do not overlap", () => {
    const a = trainingItem({
      id: "training:a",
      startAt: new Date("2026-08-10T15:00:00.000Z"),
      endAt: new Date("2026-08-10T16:30:00.000Z"),
    });
    const b = trainingItem({
      id: "training:b",
      trainingSessionId: "b",
      startAt: new Date("2026-08-10T16:45:00.000Z"),
      endAt: new Date("2026-08-10T18:15:00.000Z"),
      dressingRoomAllocations: [
        {
          facilityResourceId: "room-1",
          facilityId: "f1",
          code: "E1",
          name: "E1",
          facilityName: "G",
          occupancyBeforeMinutes: 30,
          occupancyAfterMinutes: 30,
        },
      ],
    });
    const annotated = detectWeekplannerConflicts([a, b]);
    expect(annotated[0]?.conflicts.length).toBeGreaterThan(0);
  });

  it("does not conflict when effective windows only touch at an endpoint", () => {
    const a = trainingItem({
      id: "training:a",
      startAt: new Date("2026-08-10T15:00:00.000Z"),
      endAt: new Date("2026-08-10T16:00:00.000Z"),
      dressingRoomResolvedBeforeMinutes: 0,
      dressingRoomResolvedAfterMinutes: 0,
      dressingRoomAllocations: [
        {
          facilityResourceId: "room-1",
          facilityId: "f1",
          code: "E1",
          name: "E1",
          facilityName: "G",
          occupancyBeforeMinutes: 0,
          occupancyAfterMinutes: 0,
        },
      ],
    });
    const b = trainingItem({
      id: "training:b",
      trainingSessionId: "b",
      startAt: new Date("2026-08-10T16:00:00.000Z"),
      endAt: new Date("2026-08-10T17:00:00.000Z"),
      dressingRoomResolvedBeforeMinutes: 0,
      dressingRoomResolvedAfterMinutes: 0,
      dressingRoomAllocations: [
        {
          facilityResourceId: "room-1",
          facilityId: "f1",
          code: "E1",
          name: "E1",
          facilityName: "G",
          occupancyBeforeMinutes: 0,
          occupancyAfterMinutes: 0,
        },
      ],
    });
    const annotated = detectWeekplannerConflicts([a, b]);
    expect(annotated[0]?.conflicts.length ?? 0).toBe(0);
  });

  it("does not create dressing conflict for same times in different rooms", () => {
    const a = trainingItem({ id: "training:a" });
    const b = trainingItem({
      id: "training:b",
      trainingSessionId: "b",
      dressingRoomAllocations: [
        {
          facilityResourceId: "room-2",
          facilityId: "f1",
          code: "E2",
          name: "E2",
          facilityName: "G",
          occupancyBeforeMinutes: 30,
          occupancyAfterMinutes: 30,
        },
      ],
    });
    const annotated = detectWeekplannerConflicts([a, b]);
    expect(annotated[0]?.conflicts.length ?? 0).toBe(0);
  });

  it("does not change pitch conflict semantics when pitch times overlap", () => {
    const pitch = {
      facilityResourceId: "pitch-1",
      facilityId: "f1",
      code: "KR1",
      name: "KR1",
      facilityName: "G",
      occupancyBeforeMinutes: 0,
      occupancyAfterMinutes: 0,
    };
    const a = trainingItem({
      id: "training:a",
      pitchAllocations: [pitch],
      dressingRoomAllocations: [],
      dressingRoomResolvedBeforeMinutes: 0,
      dressingRoomResolvedAfterMinutes: 0,
    });
    const b = trainingItem({
      id: "training:b",
      trainingSessionId: "b",
      startAt: new Date("2026-08-10T15:30:00.000Z"),
      endAt: new Date("2026-08-10T17:00:00.000Z"),
      pitchAllocations: [pitch],
      dressingRoomAllocations: [],
      dressingRoomResolvedBeforeMinutes: 0,
      dressingRoomResolvedAfterMinutes: 0,
    });
    const annotated = detectWeekplannerConflicts([a, b]);
    expect(annotated[0]?.conflicts.length).toBeGreaterThan(0);
  });
});

describe("direct manipulation projection", () => {
  it("moves effective dressing occupancy when activity time is dragged", () => {
    const item = trainingItem();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart: new Date("2026-08-10T15:30:00.000Z"),
      proposedEnd: new Date("2026-08-10T17:00:00.000Z"),
      manipulationType: "move",
      item,
    };
    const projected = projectItemWithDraft(item, draft, null, "dressing");
    expect(projected.startAt.toISOString()).toBe("2026-08-10T15:30:00.000Z");
    expect(projected.dressingRoomResolvedBeforeMinutes).toBe(30);
    expect(projected.dressingRoomOccupancyMode).toBe("DEFAULT");
  });
});

describe("platform defaults", () => {
  it("uses non-zero match defaults from platform constants", () => {
    expect(PLATFORM_DRESSING_ROOM_OCCUPANCY_PRESETS.match.beforeMinutes).toBeGreaterThan(0);
  });
});
