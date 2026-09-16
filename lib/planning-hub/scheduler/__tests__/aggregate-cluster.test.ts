import { describe, expect, it } from "vitest";
import { summarizeAggregateCluster } from "../aggregate-cluster";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

function item(id: string, conflicts: WeekplannerItem["conflicts"] = []): WeekplannerItem {
  return {
    id,
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date(),
    endAt: new Date(),
    canonicalStartAt: new Date(),
    canonicalEndAt: new Date(),
    timeOverridden: false,
    title: "Training",
    teamNames: ["F2"],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts,
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    trainingSeriesId: "s",
    trainingSessionId: "sess",
    teamSeasonId: "ts",
  } as WeekplannerItem;
}

describe("summarizeAggregateCluster", () => {
  it("counts canonical resource conflicts only", () => {
    const summary = summarizeAggregateCluster([
      item("a"),
      item("b", [{ facilityResourceId: "r1", facilityResourceName: "F1" }]),
    ]);
    expect(summary.activityCount).toBe(2);
    expect(summary.conflictCount).toBe(1);
  });

  it("orders identity preview deterministically", () => {
    const summary = summarizeAggregateCluster([
      item("a"),
      { ...item("b"), teamNames: ["F3"] },
    ]);
    expect(summary.identityPreview).toBe("F2 · F3");
  });
});
