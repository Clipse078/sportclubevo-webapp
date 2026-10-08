import { describe, expect, it } from "vitest";
import {
  canOpenPlannerCanonicalEditor,
  canOperationalManagePlannerItem,
} from "@/lib/planning-hub/planner-canonical-edit-access";
import { WEEKPLANNER_DRESSING_OCCUPANCY_STUB } from "@/lib/weekplanner/test-fixtures";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

const allocationOnly = {
  canManageTrainings: false,
  canManageEvents: false,
  canManageAllocations: true,
};

const match: WeekplannerItem = {
  id: "m1",
  tenantId: "t1",
  type: "MATCH",
  startAt: new Date("2026-09-22T14:00:00.000Z"),
  endAt: new Date("2026-09-22T16:00:00.000Z"),
  canonicalStartAt: new Date("2026-09-22T14:00:00.000Z"),
  canonicalEndAt: new Date("2026-09-22T16:00:00.000Z"),
  title: "Heimspiel",
  teamNames: ["E3"],
  pitchAllocations: [],
  dressingRoomAllocations: [],
  awayDressingRoomAllocations: [],
  canonicalPitchAllocations: [],
  canonicalDressingRoomAllocations: [],
  pitchOverridden: false,
  dressingRoomOverridden: false,
  timeOverridden: false,
  conflicts: [],
  eventId: "ev-1",
  opponentName: "FC Test",
  eventSource: "MANUAL",
  homeSide: { displayName: "Home", logoUrl: null, isOwnTeam: true },
  awaySide: { displayName: "Away", logoUrl: null, isOwnTeam: false },
  ...WEEKPLANNER_DRESSING_OCCUPANCY_STUB,
};

describe("planner-canonical-edit-access", () => {
  it("allows Spielbetrieb allocator to open Match editor without events.manage", () => {
    expect(canOperationalManagePlannerItem(match, allocationOnly)).toBe(true);
    expect(canOpenPlannerCanonicalEditor(match, allocationOnly)).toBe(true);
  });

  it("does not grant Veranstaltung editor on allocation manage alone", () => {
    const veranstaltung = { ...match, type: "VERANSTALTUNG" as const, eventId: "ev-2" };
    expect(canOpenPlannerCanonicalEditor(veranstaltung, allocationOnly)).toBe(false);
  });
});
