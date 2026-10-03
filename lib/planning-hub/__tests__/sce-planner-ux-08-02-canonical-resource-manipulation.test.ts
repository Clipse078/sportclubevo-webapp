import { describe, expect, it } from "vitest";
import {
  isSyntheticCollapsedResourceId,
  manipulationFromSchedulerDraft,
  resourceKindForCategory,
  schedulerTimeTargetForCategory,
} from "../planning-resource-manipulation";
import { applyPitchOccupancyBuffersToItem } from "../scheduler/resource-occupancy-manipulation";
import { projectItemWithDraft } from "../manipulation-projection";
import type { SchedulerDraftChange } from "../scheduler-draft";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

const PITCH = {
  facilityResourceId: "pitch-a",
  facilityId: "f1",
  code: "A",
  name: "Kunstrasen A",
  facilityName: "Anlage",
  occupancyBeforeMinutes: 60,
  occupancyAfterMinutes: 30,
};

function training(): WeekplannerItem {
  return {
    id: "training:t1",
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date("2026-08-10T15:00:00.000Z"),
    endAt: new Date("2026-08-10T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-08-10T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-08-10T16:30:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: ["E2"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    trainingSeriesId: "s1",
    trainingSessionId: "sess-1",
    teamSeasonId: "ts1",
  } as WeekplannerItem;
}

describe("SCE-PLANNER-UX-08-02 canonical resource manipulation", () => {
  it("maps resource kinds and mutation types", () => {
    expect(resourceKindForCategory("pitch")).toBe("PITCH");
    expect(resourceKindForCategory("dressing")).toBe("DRESSING_ROOM");
    expect(schedulerTimeTargetForCategory("pitch", "resourceTimeline")).toBe("resourceOccupancy");
    expect(schedulerTimeTargetForCategory("pitch", "kalender")).toBe("activity");
  });

  it("rejects synthetic collapsed pitch rows as drop targets", () => {
    expect(isSyntheticCollapsedResourceId("__collapsed__fac-kr3")).toBe(true);
    expect(isSyntheticCollapsedResourceId("KR3-a")).toBe(false);
  });

  it("projects pitch occupancy resize without changing training activity time", () => {
    const item = training();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: new Date("2026-08-10T14:00:00.000Z"),
      originalEnd: new Date("2026-08-10T17:00:00.000Z"),
      proposedStart: new Date("2026-08-10T14:15:00.000Z"),
      proposedEnd: new Date("2026-08-10T17:00:00.000Z"),
      manipulationType: "resize",
      timeTarget: "resourceOccupancy",
      item,
    };
    const projected = projectItemWithDraft(item, draft, null, "pitch");
    expect(projected.startAt).toEqual(item.startAt);
    expect(projected.endAt).toEqual(item.endAt);
    expect(projected.pitchAllocations[0]?.occupancyBeforeMinutes).toBe(45);
  });

  it("builds PlanningResourceManipulation from scheduler draft", () => {
    const item = training();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart: item.startAt,
      proposedEnd: item.endAt,
      originalResourceId: PITCH.facilityResourceId,
      proposedResourceId: "pitch-b",
      manipulationType: "combined",
      timeTarget: "resourceOccupancy",
      item,
    };
    const model = manipulationFromSchedulerDraft(draft, "pitch");
    expect(model.resourceKind).toBe("PITCH");
    expect(model.mutationType).toBe("MOVE_RESOURCE_AND_TIME");
    expect(model.targetFacilityResourceId).toBe("pitch-b");
  });

  it("applyPitchOccupancyBuffersToItem updates pitch refs only", () => {
    const item = training();
    const next = applyPitchOccupancyBuffersToItem(item, 15, 0);
    expect(next.pitchAllocations[0]?.occupancyBeforeMinutes).toBe(15);
    expect(next.dressingRoomResolvedBeforeMinutes).toBe(item.dressingRoomResolvedBeforeMinutes);
  });
});
