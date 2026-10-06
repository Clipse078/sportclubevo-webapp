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
    expect(summary.endTimeActionCount).toBe(0);
  });

  it("orders identity preview deterministically", () => {
    const summary = summarizeAggregateCluster([
      item("a"),
      { ...item("b"), teamNames: ["F3"] },
    ]);
    expect(summary.identityPreview).toBe("F2 · F3");
    expect(summary.headline).toBe("2 Trainings");
    expect(summary.isMixedActivityTypes).toBe(false);
  });

  it("uses neutral headline for homogeneous training cluster", () => {
    const summary = summarizeAggregateCluster(Array.from({ length: 7 }, (_, i) => item(`t-${i}`)));
    expect(summary.headline).toBe("7 Trainings");
    expect(summary.isMixedActivityTypes).toBe(false);
  });

  it("uses Aktivitäten headline when activity types are mixed", () => {
    const match = {
      ...item("m1"),
      type: "MATCH" as const,
      teamNames: ["Team Spiel"],
    };
    const trainings = Array.from({ length: 9 }, (_, i) => item(`t-${i}`));
    const summary = summarizeAggregateCluster([match, ...trainings]);
    expect(summary.activityCount).toBe(10);
    expect(summary.headline).toBe("10 Aktivitäten");
    expect(summary.isMixedActivityTypes).toBe(true);
    expect(summary.headline).not.toContain("Trainings");
    expect(summary.headline).not.toMatch(/Spiel/i);
  });

  it("preserves conflict count for mixed clusters", () => {
    const conflicted = Array.from({ length: 9 }, (_, i) =>
      item(`c-${i}`, [{ facilityResourceId: "r1", facilityResourceName: "F1" }]),
    );
    const match = { ...item("m1"), type: "MATCH" as const };
    const summary = summarizeAggregateCluster([...conflicted, match]);
    expect(summary.conflictCount).toBe(9);
    expect(summary.conflictLabel).toBe("9 Konflikte");
    expect(summary.headline).toBe("10 Aktivitäten");
  });
});
