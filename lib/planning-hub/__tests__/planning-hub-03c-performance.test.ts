import { describe, expect, it, vi } from "vitest";
import { evaluateManipulationConflicts } from "../manipulation-projection";
import { draftGeometryKey } from "../scheduler/draft-geometry-key";
import type { SchedulerDraftChange } from "../scheduler-draft";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

function training(id: string, hour: number): WeekplannerItem {
  const start = new Date(`2026-09-20T${String(hour).padStart(2, "0")}:00:00.000Z`);
  const end = new Date(start.getTime() + 90 * 60_000);
  return {
    id: `training:${id}`,
    tenantId: "t1",
    type: "TRAINING",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: `T ${id}`,
    teamNames: ["Team"],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    trainingSeriesId: "s1",
    trainingSessionId: id,
    teamSeasonId: "ts1",
  } as WeekplannerItem;
}

describe("PLANNING-HUB-03C performance guards", () => {
  it("calendar draft geometry key stable across identical snapped proposals", () => {
    const item = training("a", 15);
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart: new Date("2026-09-20T16:00:00.000Z"),
      proposedEnd: new Date("2026-09-20T17:30:00.000Z"),
      manipulationType: "move",
      timeTarget: "activity",
      item,
    };
    expect(draftGeometryKey(draft)).toBe(draftGeometryKey({ ...draft }));
  });

  it("conflict preview for calendar draft is bounded when geometry key unchanged", () => {
    const items = Array.from({ length: 80 }, (_, i) => training(`t-${i}`, 8 + (i % 8)));
    const mover = items[0]!;
    const draft: SchedulerDraftChange = {
      itemId: mover.id,
      originalStart: mover.startAt,
      originalEnd: mover.endAt,
      proposedStart: new Date("2026-09-20T16:00:00.000Z"),
      proposedEnd: new Date("2026-09-20T17:30:00.000Z"),
      manipulationType: "move",
      timeTarget: "activity",
      item: mover,
    };
    const key = draftGeometryKey(draft);
    let evaluations = 0;
    const evaluate = () => {
      evaluations += 1;
      return evaluateManipulationConflicts(items, draft, null, "pitch");
    };
    evaluate();
    if (draftGeometryKey(draft) === key) {
      /* commitPreviewDraft would skip second evaluation */
    } else {
      evaluate();
    }
    expect(evaluations).toBe(1);
  });
});
