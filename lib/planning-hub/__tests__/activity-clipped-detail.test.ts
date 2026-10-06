import { describe, expect, it } from "vitest";
import {
  buildActivityClippedDetailModel,
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
