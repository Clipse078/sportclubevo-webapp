import { describe, expect, it } from "vitest";
import {
  buildActivityClippedDetailModel,
  buildAggregateClippedDetailModel,
  shouldOfferActivityClippedDetailDisclosure,
} from "../activity-clipped-detail";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

const PITCH = {
  facilityResourceId: "res-1",
  facilityId: "fac-hf",
  code: "STADION_A",
  name: "Hauptfeld A",
  facilityName: "Hauptfeld",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

function training(): WeekplannerTrainingItem {
  return {
    id: "t1",
    tenantId: "tenant",
    type: "TRAINING",
    startAt: new Date("2026-10-05T15:00:00.000Z"),
    endAt: new Date("2026-10-05T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T16:30:00.000Z"),
    timeOverridden: false,
    title: "Technik",
    teamNames: ["FCA Senioren"],
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
    trainingSeriesId: "s1",
    trainingSessionId: "t1",
    teamSeasonId: "ts1",
  };
}

describe("activity-clipped-detail geometry", () => {
  it("offers disclosure for compact narrow blocks", () => {
    expect(
      shouldOfferActivityClippedDetailDisclosure({
        compact: true,
        blockWidthPx: 90,
        blockHeightPx: 34,
      }),
    ).toBe(true);
  });

  it("uses layoutWidthPx when CSS width is calc()", () => {
    expect(
      shouldOfferActivityClippedDetailDisclosure({
        compact: true,
        blockWidthPx: 240,
        blockHeightPx: 90,
        layoutWidthPx: 58,
      }),
    ).toBe(true);
  });

  it("skips disclosure for spacious non-compact blocks", () => {
    expect(
      shouldOfferActivityClippedDetailDisclosure({
        compact: false,
        blockWidthPx: 180,
        blockHeightPx: 72,
      }),
    ).toBe(false);
  });
});

describe("buildActivityClippedDetailModel", () => {
  it("reuses canonical pitch and venue labels", () => {
    const model = buildActivityClippedDetailModel(training(), "de-CH", "Europe/Zurich");
    expect(model.typeLabel).toBe("Training");
    expect(model.title).toContain("FCA Senioren");
    expect(model.lines.some((l) => l.term === "Spielfeld" && l.description.includes("Hauptfeld A"))).toBe(
      true,
    );
    expect(model.lines.some((l) => l.term === "Anlage" && l.description.includes("Hauptfeld"))).toBe(true);
  });
});

describe("buildAggregateClippedDetailModel", () => {
  it("lists full team identities for aggregation cards", () => {
    const items = [
      training(),
      { ...training(), id: "t2", teamNames: ["Team B"], trainingSessionId: "t2" },
    ];
    const model = buildAggregateClippedDetailModel(items, "de-CH", "Europe/Zurich", "10:00–11:30");
    expect(model.title).toBe("2 Trainings");
    expect(model.suppressActivityTypeHeader).toBe(true);
    expect(model.lines.some((l) => l.term === "Teams" && l.description.includes("Team B"))).toBe(true);
  });

  it("uses neutral mixed aggregate identity in clipped detail", () => {
    const match = {
      ...training(),
      id: "m1",
      type: "MATCH" as const,
      teamNames: ["Team Spiel"],
    };
    const trainings = Array.from({ length: 9 }, (_, i) => ({
      ...training(),
      id: `t-${i}`,
      trainingSessionId: `t-${i}`,
      teamNames: [`Training Team ${i}`],
    }));
    const items = [match, ...trainings];
    const model = buildAggregateClippedDetailModel(items, "de-CH", "Europe/Zurich", "18:45–22:15");
    expect(model.title).toBe("10 Aktivitäten");
    expect(model.title).not.toContain("Trainings");
    expect(model.typeLabel).toBe("Aktivitäten");
    expect(model.lines.some((l) => l.term === "Anzahl" && l.description === "10")).toBe(true);
  });

  it("reports conflicts for mixed aggregates without implying a single activity type", () => {
    const conflict = [{ facilityResourceId: "r1", facilityResourceName: "F1" }];
    const trainings = Array.from({ length: 9 }, (_, i) => ({
      ...training(),
      id: `t-${i}`,
      trainingSessionId: `t-${i}`,
      conflicts: conflict,
    }));
    const match = { ...training(), id: "m1", type: "MATCH" as const, conflicts: [] as typeof conflict };
    const model = buildAggregateClippedDetailModel(
      [...trainings, match],
      "de-CH",
      "Europe/Zurich",
      "18:45–22:15",
    );
    expect(model.title).toBe("10 Aktivitäten");
    expect(model.operationalNote).toBe("9 Konflikte");
    expect(model.lines.some((l) => l.term === "Konflikte" && l.description === "9 Konflikte")).toBe(true);
  });
});
