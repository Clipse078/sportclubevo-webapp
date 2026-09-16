import { describe, expect, it } from "vitest";
import { canInlineReassignItem } from "../reassignment";
import type { WeekplannerTrainingItem, WeekplannerVeranstaltungItem } from "@/lib/weekplanner/types";

const TRAINING: WeekplannerTrainingItem = {
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
  conflicts: [],
  trainingSeriesId: "s",
  trainingSessionId: "1",
  teamSeasonId: "ts",
};

const VERANSTALTUNG: WeekplannerVeranstaltungItem = {
  id: "veranstaltung:1",
  tenantId: "t1",
  type: "VERANSTALTUNG",
  startAt: new Date(),
  endAt: new Date(),
  canonicalStartAt: new Date(),
  canonicalEndAt: new Date(),
  timeOverridden: false,
  title: "GV",
  teamNames: [],
  pitchAllocations: [],
  dressingRoomAllocations: [],
  canonicalPitchAllocations: [],
  canonicalDressingRoomAllocations: [],
  pitchOverridden: false,
  dressingRoomOverridden: false,
  conflicts: [],
  eventId: "e1",
  location: "Saal",
  teamSeasonId: null,
};

describe("canInlineReassignItem", () => {
  it("allows training when manager on standard plan", () => {
    expect(
      canInlineReassignItem(TRAINING, {
        canManageTrainings: true,
        canManageEvents: false,
        isStandardplan: true,
      }),
    ).toBe(true);
  });

  it("denies Veranstaltungen and alternative plans", () => {
    expect(
      canInlineReassignItem(VERANSTALTUNG, {
        canManageTrainings: true,
        canManageEvents: true,
        isStandardplan: true,
      }),
    ).toBe(false);
    expect(
      canInlineReassignItem(TRAINING, {
        canManageTrainings: true,
        canManageEvents: true,
        isStandardplan: false,
      }),
    ).toBe(false);
  });
});
