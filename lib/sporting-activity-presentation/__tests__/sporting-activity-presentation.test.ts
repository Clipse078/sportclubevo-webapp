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
import {
  formatSportingActivityCompactAgendaSecondaryLine,
  formatSportingActivityCompactPrimaryText,
} from "../compact";
import { filterCompactMetadataPartsAgainstPrimary } from "../compact-dedupe";
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
    it("organiser in context; venue lines exclude organiser duplication", () => {
      const presentation = buildTournamentActivityPresentation({
        resourceKey: "event:t1",
        title: "Hallenturnier",
        typeLabel: "Turnier",
        teamName: "Junioren F2",
        organiserName: "FC Lausen 72",
        location: "Sportanlage Bifang",
        startAt,
      });

      expect(presentation.context?.organiser).toBe("FC Lausen 72");
      expect(formatSportingActivityLocationLines(presentation.location)).toEqual(["Sportanlage Bifang"]);
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

      expect(formatSportingActivityLocationLines(presentation.location)).toEqual(["Sportanlage Bifang"]);
    });
  });

  describe("SCE-ACTIVITY-UX-01R1 compact agenda contract", () => {
    const fmtCfg = { locale: "de-CH", timezone: "Europe/Zurich" };
    const endAt = new Date("2026-10-10T09:30:00.000Z");

    it("TRAINING — end time, venue, resource; no placeholder when resource absent", () => {
      const withResource = buildTrainingActivityPresentation({
        resourceKey: "training-session:10",
        title: "Junioren F2 Training",
        typeLabel: "Training",
        teamName: "Junioren F2",
        startAt,
        endAt,
        clubContextName: "FC Allschwil",
        facilityName: "Im Brüel",
        pitchResourceName: "KR2",
      });

      expect(formatSportingActivityCompactPrimaryText(withResource)).toBe("Junioren F2 Training");
      const secondaryWithResource = formatSportingActivityCompactAgendaSecondaryLine(withResource, {
        schedulePresentation: "omit-start",
        fmtCfg,
      });
      expect(secondaryWithResource).toMatch(/FC Allschwil/);
      expect(secondaryWithResource).toMatch(/Im Brüel/);
      expect(secondaryWithResource).toMatch(/KR2/);
      expect(secondaryWithResource).not.toMatch(/Junioren F2/);

      const withoutResource = buildTrainingActivityPresentation({
        resourceKey: "training-session:11",
        title: "Training",
        typeLabel: "Training",
        startAt,
        endAt,
        facilityName: "Im Brüel",
      });

      const secondary = formatSportingActivityCompactAgendaSecondaryLine(withoutResource, {
        schedulePresentation: "omit-start",
        fmtCfg,
      });
      expect(secondary).toMatch(/Im Brüel/);
      expect(secondary).not.toMatch(/KR2|Platz|unbekannt/i);
    });

    it("MATCH — fixture primary; away venue without fabricated resource", () => {
      const away = buildMatchActivityPresentation({
        resourceKey: "event:m-away",
        title: "Spiel",
        typeLabel: "Spiel",
        teamName: "1. Mannschaft",
        opponentName: "BSC Old Boys",
        homeAway: "AWAY",
        location: "Schützenmatte, Basel",
        startAt,
        tenantClubName: "FC Allschwil",
      });

      expect(formatSportingActivityCompactPrimaryText(away)).toContain("BSC Old Boys");
      const secondary = formatSportingActivityCompactAgendaSecondaryLine(away, {
        schedulePresentation: "omit-start",
      });
      expect(secondary).toMatch(/Auswärts/);
      expect(secondary).toMatch(/Schützenmatte, Basel/);
      expect(secondary).not.toMatch(/BSC Old Boys/);
      expect(secondary).not.toMatch(/Platz|KR|Feld/i);
    });

    it("MATCH — home resource when supplied", () => {
      const home = buildMatchActivityPresentation({
        resourceKey: "event:m-home",
        title: "Spiel",
        typeLabel: "Spiel",
        teamName: "2. Mannschaft",
        opponentName: "FC Bubendorf",
        homeAway: "HOME",
        location: "Im Brüel",
        pitchCode: "kr3",
        pitchLabel: "Kunstrasen 3",
        startAt,
        tenantClubName: "FC Allschwil",
      });

      const secondary = formatSportingActivityCompactAgendaSecondaryLine(home, {
        schedulePresentation: "omit-start",
      });
      expect(secondary).toMatch(/Im Brüel/);
      expect(secondary).toMatch(/Kunstrasen 3/);
      expect(secondary).not.toMatch(/Auswärts/);
      expect(secondary).not.toMatch(/FC Allschwil/);
    });

    it("TOURNAMENT — team in primary; organiser and venue in secondary", () => {
      const tournament = buildTournamentActivityPresentation({
        resourceKey: "event:t-agenda",
        title: "PlayMore Turnier",
        typeLabel: "Turnier",
        teamName: "Junioren F2",
        organiserName: "FC Arisdorf",
        location: "Gemeindesportplatz",
        startAt,
      });

      expect(formatSportingActivityCompactPrimaryText(tournament)).toBe(
        "PlayMore Turnier · Junioren F2",
      );
      const secondary = formatSportingActivityCompactAgendaSecondaryLine(tournament, {
        schedulePresentation: "omit-start",
      });
      expect(secondary).toMatch(/FC Arisdorf/);
      expect(secondary).toMatch(/Gemeindesportplatz/);
      expect(secondary).not.toMatch(/Junioren F2/);
    });

    it("TOURNAMENT — organiser distinct from venue when names differ", () => {
      const tournament = buildTournamentActivityPresentation({
        resourceKey: "event:t-distinct",
        title: "Cup",
        typeLabel: "Turnier",
        organiserName: "FC Lausen 72",
        location: "Sportanlage Bifang",
        startAt,
      });

      const secondary = formatSportingActivityCompactAgendaSecondaryLine(tournament, {
        schedulePresentation: "omit-start",
      });
      expect(secondary).toBe("FC Lausen 72 · Sportanlage Bifang");
    });
  });

  describe("SCE-ACTIVITY-UX-01R2 compact deduplication", () => {
    const fmtCfg = { locale: "de-CH", timezone: "Europe/Zurich" };

    it("drops duplicate metadata segments and team names already in the title", () => {
      const presentation = buildTrainingActivityPresentation({
        resourceKey: "training-session:dedupe",
        title: "Junioren F2 Training",
        typeLabel: "Training",
        teamName: "Junioren F2",
        startAt,
        clubContextName: "FC Allschwil",
        facilityName: "Im Brüel",
      });

      const primary = formatSportingActivityCompactPrimaryText(presentation);
      const filtered = filterCompactMetadataPartsAgainstPrimary(presentation, primary, [
        "Junioren F2",
        "FC Allschwil",
        "Im Brüel",
        "Im Brüel",
      ]);

      expect(filtered).toEqual(["FC Allschwil", "Im Brüel"]);
    });

    it("keeps clean separators when venue/context/resource are missing", () => {
      const presentation = buildTrainingActivityPresentation({
        resourceKey: "training-session:sparse",
        title: "Techniktraining",
        typeLabel: "Training",
        startAt,
        clubContextName: "FC Allschwil",
      });

      const secondary = formatSportingActivityCompactAgendaSecondaryLine(presentation, {
        schedulePresentation: "omit-start",
        fmtCfg,
      });

      expect(secondary).toBe("FC Allschwil");
    });

    it("away match secondary never repeats opponent from the fixture", () => {
      const away = buildMatchActivityPresentation({
        resourceKey: "event:dedupe-away",
        title: "Spiel",
        typeLabel: "Spiel",
        teamName: "1. Mannschaft",
        opponentName: "BSC Old Boys",
        homeAway: "AWAY",
        location: "Schützenmatte, Basel",
        startAt,
        tenantClubName: "FC Allschwil",
      });

      const secondary =
        formatSportingActivityCompactAgendaSecondaryLine(away, {
          schedulePresentation: "omit-start",
        }) ?? "";

      expect(secondary.split(" · ").filter((part) => part === "BSC Old Boys")).toHaveLength(0);
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
