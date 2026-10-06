import { describe, expect, it } from "vitest";
import type { WeekplannerMatchItem, WeekplannerTrainingItem } from "@/lib/weekplanner/types";
import { canCancelTrainingActivity } from "../training-activity-cancellation";

const PITCH = {
  facilityResourceId: "p1",
  facilityId: "f1",
  code: "A",
  name: "Hauptfeld A",
  facilityName: "Anlage",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

function training(overrides: Partial<WeekplannerTrainingItem> = {}): WeekplannerTrainingItem {
  const start = new Date("2026-10-07T18:15:00.000Z");
  const end = new Date("2026-10-07T19:45:00.000Z");
  return {
    id: "training:30",
    tenantId: "t1",
    type: "TRAINING",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: "Senioren 30+",
    teamNames: ["Senioren 30+"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    trainingSeriesId: "series-30",
    trainingSessionId: "sess-30",
    teamSeasonId: "ts-30",
    ...overrides,
  };
}

function match(overrides: Partial<WeekplannerMatchItem> = {}): WeekplannerMatchItem {
  const start = new Date("2026-10-07T18:15:00.000Z");
  const end = new Date("2026-10-07T20:15:00.000Z");
  return {
    id: "match:30",
    tenantId: "t1",
    type: "MATCH",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: "Senioren 30+ vs FC Dardania",
    teamNames: ["Senioren 30+"],
    teamSeasonId: "ts-30",
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "ev-30",
    eventSource: "SFV",
    opponentName: "FC Dardania",
    homeAway: "HOME",
    homeSide: { displayName: "Senioren 30+", logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: "FC Dardania", logoUrl: null, isOwnTeam: false },
    awayDressingRoomAllocations: [],
    ...overrides,
  };
}

const actorManage = {
  canManageTrainings: true,
  canManageEvents: true,
  canManageAllocations: true,
};

const actorReadOnly = {
  canManageTrainings: false,
  canManageEvents: false,
  canManageAllocations: false,
};

describe("SCE-PLANNER-UX-08-07R4 — canCancelTrainingActivity", () => {
  it("authorizes canonical training with session id", () => {
    expect(canCancelTrainingActivity(training(), actorManage)).toBe(true);
  });

  it("rejects MATCH even when actor may manage trainings", () => {
    expect(canCancelTrainingActivity(match(), actorManage)).toBe(false);
  });

  it("rejects unauthorized actor", () => {
    expect(canCancelTrainingActivity(training(), actorReadOnly)).toBe(false);
  });

  it("rejects training without session id", () => {
    expect(canCancelTrainingActivity(training({ trainingSessionId: "" }), actorManage)).toBe(false);
    expect(canCancelTrainingActivity(training({ trainingSessionId: "   " }), actorManage)).toBe(false);
  });

  it("does not require conflicts or same-team match", () => {
    expect(canCancelTrainingActivity(training({ conflicts: [] }), actorManage)).toBe(true);
  });
});
