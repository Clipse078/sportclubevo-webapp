import { describe, expect, it } from "vitest";
import { buildResourceSegmentsForDay } from "../scheduler/resource-segments";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

function trainingWithDressing(): WeekplannerItem {
  return {
    id: "training:t1",
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
  } as WeekplannerItem;
}

describe("buildResourceSegmentsForDay — Garderobe", () => {
  it("uses effective occupancy for dressing segments", () => {
    const segments = buildResourceSegmentsForDay([trainingWithDressing()], "dressing");
    expect(segments).toHaveLength(1);
    expect(segments[0]!.startAt.toISOString()).toBe("2026-08-10T14:30:00.000Z");
    expect(segments[0]!.endAt.toISOString()).toBe("2026-08-10T17:00:00.000Z");
    expect(segments[0]!.nominalStartAt?.toISOString()).toBe("2026-08-10T15:00:00.000Z");
    expect(segments[0]!.nominalEndAt?.toISOString()).toBe("2026-08-10T16:30:00.000Z");
  });

  it("keeps nominal activity span for pitch segments", () => {
    const item = {
      ...trainingWithDressing(),
      pitchAllocations: [
        {
          facilityResourceId: "pitch-1",
          facilityId: "f1",
          code: "KR1",
          name: "KR1",
          facilityName: "G",
          occupancyBeforeMinutes: 0,
          occupancyAfterMinutes: 0,
        },
      ],
    };
    const segments = buildResourceSegmentsForDay([item], "pitch");
    expect(segments[0]!.startAt.toISOString()).toBe("2026-08-10T15:00:00.000Z");
    expect(segments[0]!.endAt.toISOString()).toBe("2026-08-10T16:30:00.000Z");
  });
});
