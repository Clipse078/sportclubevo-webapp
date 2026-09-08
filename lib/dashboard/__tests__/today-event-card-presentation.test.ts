import { describe, expect, it } from "vitest";
import {
  buildTodayMatchMetaLine,
  buildTodayTournamentParticipantSummary,
  formatTodayEventTypeBadge,
  isTodayMatchCard,
  isTodayTournamentCard,
} from "@/lib/dashboard/today-event-card-presentation";
import type { TodayScheduleItem } from "@/lib/dashboard/command-center";

describe("SCE-DASHBOARD-V3-03 — today event card presentation", () => {
  describe("isTodayMatchCard", () => {
    it("returns true only for match items with presentation data", () => {
      const matchItem = {
        eventType: "MATCH",
        matchPresentation: {
          home: { displayName: "Heim", logoUrl: null },
          away: { displayName: "Gast", logoUrl: null },
        },
      } as TodayScheduleItem;

      expect(isTodayMatchCard(matchItem)).toBe(true);
      expect(isTodayMatchCard({ ...matchItem, matchPresentation: undefined })).toBe(false);
      expect(isTodayMatchCard({ ...matchItem, eventType: "TRAINING" })).toBe(false);
    });
  });

  describe("isTodayTournamentCard", () => {
    it("returns true for tournament schedule items", () => {
      expect(isTodayTournamentCard({ eventType: "TOURNAMENT" } as TodayScheduleItem)).toBe(true);
      expect(isTodayTournamentCard({ eventType: "MATCH" } as TodayScheduleItem)).toBe(false);
    });
  });

  describe("formatTodayEventTypeBadge", () => {
    it("uppercases type labels for compact badges", () => {
      expect(formatTodayEventTypeBadge("Spiel")).toBe("SPIEL");
      expect(formatTodayEventTypeBadge(" Turnier ")).toBe("TURNIER");
    });
  });

  describe("buildTodayMatchMetaLine", () => {
    it("keeps competition and location as separate secondary lines", () => {
      expect(
        buildTodayMatchMetaLine({
          competitionLabel: "2. Liga",
          meta: "Im Brüel · Feld 2",
        }),
      ).toEqual({
        competition: "2. Liga",
        location: "Im Brüel · Feld 2",
      });
    });
  });

  describe("buildTodayTournamentParticipantSummary", () => {
    it("returns null for zero participants and pluralizes otherwise", () => {
      expect(buildTodayTournamentParticipantSummary(0)).toBeUndefined();
      expect(buildTodayTournamentParticipantSummary(1)).toBe("1 Teilnehmer");
      expect(buildTodayTournamentParticipantSummary(4)).toBe("4 Teilnehmer");
    });
  });
});
