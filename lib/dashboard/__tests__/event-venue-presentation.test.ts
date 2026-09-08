import { describe, expect, it } from "vitest";
import {
  buildTodayEventVenuePresentation,
  formatTodayEventVenueMeta,
  normalizeFacilityDisplayLabel,
  resolvePitchPresentationLabel,
} from "@/lib/dashboard/event-venue-presentation";

describe("SCE-DASHBOARD-V3-03B — event venue presentation", () => {
  describe("normalizeFacilityDisplayLabel", () => {
    it("humanizes technical pitch codes without changing meaning", () => {
      expect(normalizeFacilityDisplayLabel("KUNSTRASEN_2")).toBe("Kunstrasen 2");
      expect(normalizeFacilityDisplayLabel("KUNSTRASEN 2")).toBe("Kunstrasen 2");
      expect(normalizeFacilityDisplayLabel("Feld KUNSTRASEN_2")).toBe("Kunstrasen 2");
    });
  });

  describe("resolvePitchPresentationLabel", () => {
    it("prefers registry labels and falls back to normalization", () => {
      expect(resolvePitchPresentationLabel("KUNSTRASEN_2")).toBe("Kunstrasen 2");
      expect(resolvePitchPresentationLabel("UNKNOWN_PITCH")).toBe("Unknown Pitch");
    });
  });

  describe("buildTodayEventVenuePresentation", () => {
    it("returns only groups backed by real data", () => {
      expect(
        buildTodayEventVenuePresentation({
          location: "Im Brüel, Allschwil",
          pitchCode: "KUNSTRASEN_2",
          homeDressingRoomCode: "O1",
          awayDressingRoomCode: "E4",
        }),
      ).toEqual({
        groups: [
          { kind: "location", label: "Im Brüel, Allschwil" },
          { kind: "pitch", label: "Kunstrasen 2" },
          { kind: "dressing-rooms", label: "O1 · E4" },
        ],
      });
    });

    it("omits empty groups", () => {
      expect(buildTodayEventVenuePresentation({})).toEqual({ groups: [] });
    });
  });

  describe("formatTodayEventVenueMeta", () => {
    it("joins venue groups for legacy meta consumers", () => {
      expect(
        formatTodayEventVenueMeta(
          buildTodayEventVenuePresentation({
            location: "Im Brüel, Allschwil",
            pitchCode: "KUNSTRASEN_2",
          }),
        ),
      ).toBe("Im Brüel, Allschwil · Kunstrasen 2");
    });
  });
});
