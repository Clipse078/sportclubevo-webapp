import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trainingSessionAllocation: { findMany: vi.fn().mockResolvedValue([]) },
    trainingAllocation: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { loadTrainingSessionFacilityHints } from "../training-facility-batch";
import {
  buildMatchActivityPresentation,
  buildTournamentActivityPresentation,
  buildTrainingActivityPresentation,
} from "../builders";
import {
  formatSportingActivityLocationLines,
  formatSportingActivityLocationSummary,
} from "../location";
import { formatSportingActivityPresentation } from "../format";

describe("SCE-ACTIVITY-UX-01 — sporting activity presentation", () => {
  const startAt = new Date("2026-10-10T08:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TENANCY", () => {
    it("scopes training facility batch queries to tenantId", async () => {
      await loadTrainingSessionFacilityHints("tenant-a", [
        { id: "sess-1", trainingSeriesId: "series-1" },
      ]);

      expect(prisma.trainingSessionAllocation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: "tenant-a" }),
        }),
      );
      expect(prisma.trainingAllocation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: "tenant-a" }),
        }),
      );
    });
  });

  describe("TRAINING", () => {
    it("home training with venue + resource", () => {
      const presentation = buildTrainingActivityPresentation({
        resourceKey: "training-session:1",
        title: "Training",
        typeLabel: "Training",
        teamName: "Junioren F2",
        startAt,
        facilityName: "Im Brüel",
        pitchResourceName: "KR2",
      });

      expect(formatSportingActivityLocationLines(presentation.location)).toEqual([
        "Im Brüel",
        "KR2",
      ]);
    });

    it("training without resource omits pitch line", () => {
      const presentation = buildTrainingActivityPresentation({
        resourceKey: "training-session:2",
        title: "Training",
        typeLabel: "Training",
        startAt,
        facilityName: "Im Brüel",
      });

      expect(formatSportingActivityLocationLines(presentation.location)).toEqual(["Im Brüel"]);
      expect(formatSportingActivityLocationSummary(presentation.location)).not.toMatch(/unbekannt/i);
    });
  });

  describe("MATCH", () => {
    it("home match uses venue and optional resource", () => {
      const presentation = buildMatchActivityPresentation({
        resourceKey: "event:m1",
        title: "FC Allschwil – FC Rival",
        typeLabel: "Spiel",
        teamName: "Junioren F2",
        homeAway: "HOME",
        location: "Im Brüel",
        pitchCode: "KR2",
        pitchLabel: "KR2",
        startAt,
        tenantClubName: "FC Allschwil",
      });

      expect(presentation.location.mode).toBe("HOME");
      expect(formatSportingActivityLocationLines(presentation.location)).toEqual([
        "Im Brüel",
        "KR2",
      ]);
    });

    it("away match with venue/address but no pitch", () => {
      const presentation = buildMatchActivityPresentation({
        resourceKey: "event:m2",
        title: "FC Arisdorf – FC Allschwil",
        typeLabel: "Spiel",
        teamName: "Junioren F2",
        opponentName: "FC Arisdorf",
        homeAway: "AWAY",
        location: "Sportanlage Weieren",
        startAt,
        tenantClubName: "FC Allschwil",
      });

      expect(formatSportingActivityLocationLines(presentation.location)).toEqual([
        "FC Arisdorf",
        "Sportanlage Weieren",
      ]);
      expect(formatSportingActivityLocationSummary(presentation.location)).not.toContain("Platz");
    });

    it("match with explicit resource only when supplied", () => {
      const presentation = buildMatchActivityPresentation({
        resourceKey: "event:m3",
        title: "Heim – Gast",
        typeLabel: "Spiel",
        homeAway: "HOME",
        location: "Im Brüel",
        pitchCode: "feld_1",
        pitchLabel: "Feld 1",
        startAt,
        tenantClubName: "FC Allschwil",
      });

      expect(formatSportingActivityLocationLines(presentation.location)).toContain("Feld 1");
    });
  });

  describe("TOURNAMENT", () => {
    it("organiser + venue distinct lines", () => {
      const presentation = buildTournamentActivityPresentation({
        resourceKey: "event:t1",
        title: "Hallenturnier",
        typeLabel: "Turnier",
        teamName: "Junioren F2",
        organiserName: "FC Lausen 72",
        location: "Sportanlage Bifang",
        startAt,
      });

      expect(formatSportingActivityLocationLines(presentation.location)).toEqual([
        "FC Lausen 72",
        "Sportanlage Bifang",
      ]);
    });

    it("venue without resource", () => {
      const presentation = buildTournamentActivityPresentation({
        resourceKey: "event:t2",
        title: "Turnier",
        typeLabel: "Turnier",
        organiserName: "FC Lausen 72",
        location: "Sportanlage Bifang",
        startAt,
      });

      expect(formatSportingActivityLocationLines(presentation.location)).toEqual([
        "FC Lausen 72",
        "Sportanlage Bifang",
      ]);
    });
  });

  describe("MISSING DATA", () => {
    it("does not fabricate placeholders", () => {
      const presentation = buildMatchActivityPresentation({
        resourceKey: "event:empty",
        title: "Spiel",
        typeLabel: "Spiel",
        homeAway: "AWAY",
        startAt,
        tenantClubName: "FC Allschwil",
      });

      expect(formatSportingActivityLocationLines(presentation.location)).toEqual([]);
      expect(formatSportingActivityLocationSummary(presentation.location)).toBeUndefined();
    });
  });

  describe("PRESENTATION densities", () => {
    it("compact + standard handle optional fields", () => {
      const presentation = buildTournamentActivityPresentation({
        resourceKey: "event:t3",
        title: "Cup",
        typeLabel: "Turnier",
        startAt,
      });

      const compact = formatSportingActivityPresentation(presentation, "compact");
      const standard = formatSportingActivityPresentation(presentation, "standard");

      expect(compact.title).toBe("Cup");
      expect(compact.subtitle).toBeUndefined();
      expect(standard.locationLines).toEqual([]);
    });
  });
});
