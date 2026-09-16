import { describe, expect, it } from "vitest";
import { filterWeekplannerItem } from "../filters";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

const BASE: WeekplannerTrainingItem = {
  id: "training:1",
  tenantId: "t1",
  type: "TRAINING",
  startAt: new Date(),
  endAt: new Date(),
  canonicalStartAt: new Date(),
  canonicalEndAt: new Date(),
  timeOverridden: false,
  title: "T",
  teamNames: ["A"],
  pitchAllocations: [],
  dressingRoomAllocations: [],
  canonicalPitchAllocations: [],
  canonicalDressingRoomAllocations: [],
  pitchOverridden: false,
  dressingRoomOverridden: false,
  conflicts: [{ facilityResourceId: "r1", facilityResourceName: "R1" }],
  trainingSeriesId: "s",
  trainingSessionId: "1",
  teamSeasonId: "ts-a",
};

describe("filterWeekplannerItem", () => {
  it("filters by activity type and conflicts-only", () => {
    expect(
      filterWeekplannerItem(BASE, {
        activity: "spiele",
        team: null,
        facility: null,
        conflictsOnly: false,
      }),
    ).toBe(false);

    expect(
      filterWeekplannerItem(BASE, {
        activity: "trainings",
        team: null,
        facility: null,
        conflictsOnly: true,
      }),
    ).toBe(true);

    expect(
      filterWeekplannerItem({ ...BASE, conflicts: [] }, {
        activity: "alle",
        team: null,
        facility: null,
        conflictsOnly: true,
      }),
    ).toBe(false);
  });
});
