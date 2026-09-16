import { describe, expect, it } from "vitest";
import {
  activityFilterToSemanticType,
  activityVisualStyle,
  aggregateClusterSemanticType,
  PLANNING_HUB_CONFLICT_BLOCK_CLASS,
} from "../activity-visual-style";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

function trainingItem(id: string): WeekplannerTrainingItem {
  const start = new Date("2026-09-16T16:00:00.000Z");
  const end = new Date("2026-09-16T17:30:00.000Z");
  return {
    id: `training:${id}`,
    tenantId: "t1",
    type: "TRAINING",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: "Training",
    teamNames: ["A"],
    teamSeasonId: "ts",
    trainingSessionId: id,
    trainingSeriesId: "s1",
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

describe("PLANNING-HUB-02F activityVisualStyle", () => {
  it("maps canonical activity types to distinct semantic styles", () => {
    expect(activityVisualStyle("TRAINING").semanticType).toBe("TRAINING");
    expect(activityVisualStyle("MATCH").semanticType).toBe("MATCH");
    expect(activityVisualStyle("TOURNAMENT").semanticType).toBe("TOURNAMENT");
    expect(activityVisualStyle("VERANSTALTUNG").semanticType).toBe("VERANSTALTUNG");
    expect(activityVisualStyle("TRAINING").leftAccentClass).toContain("indigo");
    expect(activityVisualStyle("MATCH").leftAccentClass).toContain("emerald");
    expect(activityVisualStyle("TOURNAMENT").leftAccentClass).toContain("violet");
    expect(activityVisualStyle("VERANSTALTUNG").leftAccentClass).toContain("amber");
  });

  it("fails safely to neutral for unknown types", () => {
    expect(activityVisualStyle("FUTURE_TYPE").semanticType).toBe("NEUTRAL");
  });

  it("same-type aggregate inherits semantic identity", () => {
    const items = [trainingItem("1"), trainingItem("2")];
    expect(aggregateClusterSemanticType(items)).toBe("TRAINING");
    expect(activityVisualStyle(aggregateClusterSemanticType(items)).semanticType).toBe("TRAINING");
  });

  it("mixed aggregate resolves neutral/mixed styling", () => {
    const a = trainingItem("1");
    const b = { ...a, id: "match:1", type: "MATCH" as const };
    expect(aggregateClusterSemanticType([a, b])).toBe("MIXED");
    expect(activityVisualStyle("MIXED").semanticType).toBe("MIXED");
  });

  it("conflict class does not replace semantic accent tokens", () => {
    expect(PLANNING_HUB_CONFLICT_BLOCK_CLASS).toContain("amber");
    expect(activityVisualStyle("TRAINING").leftAccentClass).not.toContain("amber");
  });

  it("filter mapping has no tenant logic", () => {
    expect(activityFilterToSemanticType("trainings")).toBe("TRAINING");
    expect(activityFilterToSemanticType("spiele")).toBe("MATCH");
  });
});
