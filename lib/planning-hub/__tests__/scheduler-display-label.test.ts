import { describe, expect, it } from "vitest";
import {
  compactSchedulerTeamName,
  formatSchedulerTeamContext,
  schedulerAssignedTeamContext,
  schedulerDisplayIdentity,
  schedulerResourceLabel,
  schedulerTeamContextForBlockWidth,
} from "../scheduler-display-label";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

function training(teamName: string): WeekplannerItem {
  return {
    id: "training:1",
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date(),
    endAt: new Date(),
    canonicalStartAt: new Date(),
    canonicalEndAt: new Date(),
    timeOverridden: false,
    title: "Training title",
    teamNames: [teamName],
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
    trainingSeriesId: "s",
    trainingSessionId: "sess",
    teamSeasonId: "ts",
  } as WeekplannerItem;
}

describe("scheduler display labels", () => {
  it("prefers compact team label when club prefix is generic", () => {
    expect(compactSchedulerTeamName("FC Example Junioren F2")).toBe("Junioren F2");
  });

  it("falls back safely when no short label exists", () => {
    expect(schedulerDisplayIdentity(training("D9-1"))).toBe("D9-1");
  });

  it("remains deterministic", () => {
    const item = training("Junioren F2");
    expect(schedulerDisplayIdentity(item)).toBe(schedulerDisplayIdentity(item));
  });

  it("does not use FCA-specific mapping tables", () => {
    expect(schedulerDisplayIdentity(training("FC Allschwil F2"))).not.toContain("Allschwil");
  });

  it("formats multi-team tournament context from canonical teamNames", () => {
    expect(formatSchedulerTeamContext(["Junioren F1", "Junioren F2"])).toBe("Junioren F1 · Junioren F2");
    expect(formatSchedulerTeamContext(["A", "B", "C"])).toBe("A · +2 Teams");
  });

  it("omits redundant match team line when primary already contains team", () => {
    const item = {
      ...training("Junioren D-7 D2"),
      type: "MATCH" as const,
      opponentName: "FC Münchenstein b",
      eventId: "e",
      homeAway: "HOME" as const,
      awayDressingRoomAllocations: [],
    } as WeekplannerItem;
    expect(schedulerAssignedTeamContext(item)).toBeNull();
  });

  it("hides secondary team metadata on very narrow blocks", () => {
    expect(schedulerTeamContextForBlockWidth("Junioren F2", 40)).toBeNull();
    expect(schedulerTeamContextForBlockWidth("Junioren F2", 140)).toBe("Junioren F2");
  });

  it("prefers human resource name over code", () => {
    expect(
      schedulerResourceLabel({
        facilityResourceId: "1",
        facilityId: "f",
        code: "KUNSTRASEN_2_A",
        name: "Kunstrasen 2 A",
        facilityName: "Hauptfeld",
        occupancyBeforeMinutes: 0,
        occupancyAfterMinutes: 0,
      }),
    ).toBe("Kunstrasen 2 A");
  });
});
