import { describe, expect, it } from "vitest";
import { derivePlanningHubListeMenuCapabilities } from "../liste-operational-menu";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

const training: WeekplannerTrainingItem = {
  id: "training:1",
  tenantId: "t1",
  type: "TRAINING",
  startAt: new Date("2026-10-05T15:00:00.000Z"),
  endAt: new Date("2026-10-05T16:30:00.000Z"),
  canonicalStartAt: new Date("2026-10-05T15:00:00.000Z"),
  canonicalEndAt: new Date("2026-10-05T16:30:00.000Z"),
  timeOverridden: false,
  title: "Training",
  teamNames: ["Junioren F2"],
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
  trainingSeriesId: "s1",
  trainingSessionId: "1",
  teamSeasonId: "ts1",
};

describe("SCE-PLANNER-OPS-01 liste operational menu", () => {
  it("offers pitch assign label when unallocated", () => {
    const caps = derivePlanningHubListeMenuCapabilities({
      item: training,
      permissionContext: {
        canManageTrainings: true,
        canManageEvents: false,
        canManageAllocations: true,
        isStandardplan: true,
        alternativePlanId: null,
      },
      canEditItem: true,
      manipulationEnabled: true,
      plannerEditAccess: {
        canManageTrainings: true,
        canManageEvents: false,
        canManageAllocations: true,
      },
      alternativePlanActive: false,
    });
    expect(caps.pitchLabel).toBe("Spielfeld zuweisen");
    expect(caps.showPitch).toBe(true);
    expect(caps.pitchUsesManipulation).toBe(false);
  });

  it("uses manipulation path when pitch is already allocated", () => {
    const allocated = {
      ...training,
      pitchAllocations: [
        {
          facilityResourceId: "p1",
          facilityId: "f1",
          code: "A",
          name: "Feld A",
          facilityName: "Sportanlage",
          resourceType: "HALF_PITCH" as const,
          occupancyBeforeMinutes: 0,
          occupancyAfterMinutes: 0,
        },
      ],
    };
    const caps = derivePlanningHubListeMenuCapabilities({
      item: allocated,
      permissionContext: {
        canManageTrainings: true,
        canManageEvents: false,
        canManageAllocations: true,
        isStandardplan: true,
        alternativePlanId: null,
      },
      canEditItem: true,
      manipulationEnabled: true,
      plannerEditAccess: {
        canManageTrainings: true,
        canManageEvents: false,
        canManageAllocations: true,
      },
      alternativePlanActive: false,
    });
    expect(caps.pitchLabel).toBe("Spielfeld ändern");
    expect(caps.pitchUsesManipulation).toBe(true);
  });
});
