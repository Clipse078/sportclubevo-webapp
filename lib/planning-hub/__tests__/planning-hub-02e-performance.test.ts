import { describe, expect, it } from "vitest";
import { buildWeekplannerWeek, detectWeekplannerConflicts } from "@/lib/weekplanner/view-model";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

function syntheticTraining(id: string, dayOffset: number, hour: number): WeekplannerTrainingItem {
  const start = new Date(`2026-09-${String(14 + dayOffset).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`);
  const end = new Date(start.getTime() + 90 * 60_000);
  return {
    id: `training:${id}`,
    tenantId: "tenant-1",
    type: "TRAINING",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: `Training ${id}`,
    teamNames: ["Team A"],
    teamSeasonId: "ts-1",
    trainingSessionId: id,
    trainingSeriesId: "series-1",
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
  };
}

describe("PLANNING-HUB-02E view-model perf smoke", () => {
  it("conflict detection stays bounded for a busy synthetic week", () => {
    const items = Array.from({ length: 120 }, (_, i) =>
      syntheticTraining(`s-${i}`, i % 7, 8 + (i % 10)),
    );
    const t0 = performance.now();
    const annotated = detectWeekplannerConflicts(items);
    const conflictMs = performance.now() - t0;

    const t1 = performance.now();
    buildWeekplannerWeek({
      items: annotated,
      days: ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20"],
      weekNumberLabel: "KW 38",
      rangeLabel: "14.–20. Sept.",
      param: "2026-09-14",
      previousParam: "2026-09-07",
      nextParam: "2026-09-21",
    });
    const buildMs = performance.now() - t1;

    expect(annotated.length).toBe(120);
    expect(conflictMs).toBeLessThan(500);
    expect(buildMs).toBeLessThan(100);
  });
});
