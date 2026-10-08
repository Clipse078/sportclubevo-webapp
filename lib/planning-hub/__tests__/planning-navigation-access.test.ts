import { describe, expect, it } from "vitest";
import { canOpenPlanningHubItem } from "../planning-navigation-access";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

function trainingItem(): WeekplannerTrainingItem {
  const startAt = new Date("2026-10-07T16:45:00.000Z");
  const endAt = new Date("2026-10-07T18:15:00.000Z");
  return {
    id: "training-1",
    tenantId: "t1",
    type: "TRAINING",
    startAt,
    endAt,
    canonicalStartAt: startAt,
    canonicalEndAt: endAt,
    timeOverridden: false,
    title: "Training",
    teamNames: ["Senioren 50+"],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    trainingSeriesId: "s1",
    trainingSessionId: "training-1",
    teamSeasonId: "ts1",
  };
}

describe("canOpenPlanningHubItem", () => {
  it("allows training open when trainings.view is granted", () => {
    expect(
      canOpenPlanningHubItem(trainingItem(), {
        canViewTrainings: true,
        canManageTrainings: false,
        canViewEvents: false,
        canManageEvents: false,
      }),
    ).toBe(true);
  });

  it("allows training open for Spielbetrieb view + allocation manage", () => {
    expect(
      canOpenPlanningHubItem(trainingItem(), {
        canViewTrainings: true,
        canManageTrainings: false,
        canViewEvents: true,
        canManageEvents: false,
      }),
    ).toBe(true);
  });
});
