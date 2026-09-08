import { describe, expect, it } from "vitest";
import {
  buildTodayEventVenuePresentation,
  formatDressingRoomsPresentation,
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

  describe("formatDressingRoomsPresentation", () => {
    it("labels explicit match home and away rooms", () => {
      expect(
        formatDressingRoomsPresentation({
          eventType: "MATCH",
          homeCode: "O1",
          awayCode: "E4",
        }),
      ).toEqual({
        semantics: "home-away",
        sides: [
          { roleLabel: "Heim", rooms: ["O1"] },
          { roleLabel: "Gast", rooms: ["E4"] },
        ],
        ariaLabel: "Heim Garderobe O1, Gast Garderobe E4",
      });
    });

    it("supports multiple rooms per home/away side", () => {
      expect(
        formatDressingRoomsPresentation({
          eventType: "MATCH",
          homeAllocations: [{ code: "O1" }, { code: "O3" }],
          awayAllocations: [{ code: "E2" }, { code: "E4" }],
        }),
      ).toEqual({
        semantics: "home-away",
        sides: [
          { roleLabel: "Heim", rooms: ["O1", "O3"] },
          { roleLabel: "Gast", rooms: ["E2", "E4"] },
        ],
        ariaLabel: "Heim Garderobe O1, O3, Gast Garderobe E2, E4",
      });
    });

    it("supports only a home room", () => {
      expect(
        formatDressingRoomsPresentation({
          eventType: "MATCH",
          homeCode: "O1",
        }),
      ).toEqual({
        semantics: "home-away",
        sides: [{ roleLabel: "Heim", rooms: ["O1"] }],
        ariaLabel: "Heim Garderobe O1",
      });
    });

    it("supports only an away room", () => {
      expect(
        formatDressingRoomsPresentation({
          eventType: "MATCH",
          awayCode: "E4",
        }),
      ).toEqual({
        semantics: "home-away",
        sides: [{ roleLabel: "Gast", rooms: ["E4"] }],
        ariaLabel: "Gast Garderobe E4",
      });
    });

    it("returns null when no dressing rooms exist", () => {
      expect(formatDressingRoomsPresentation({ eventType: "MATCH" })).toBeNull();
    });

    it("keeps training allocations neutral without Heim/Gast labels", () => {
      expect(
        formatDressingRoomsPresentation({
          eventType: "TRAINING",
          homeCode: "O1",
          awayCode: "E4",
        }),
      ).toEqual({
        semantics: "neutral",
        sides: [{ rooms: ["O1", "E4"] }],
        ariaLabel: "Garderobe O1, E4",
      });
    });

    it("uses participant labels for tournament participant allocations", () => {
      expect(
        formatDressingRoomsPresentation({
          eventType: "TOURNAMENT",
          participantAllocations: [
            {
              participantLabel: "Junioren F2",
              rooms: [{ code: "O1" }],
            },
            {
              participantLabel: "Gast Team",
              rooms: [{ code: "E1" }],
            },
          ],
        }),
      ).toEqual({
        semantics: "participant",
        sides: [
          { roleLabel: "Junioren F2", rooms: ["O1"] },
          { roleLabel: "Gast Team", rooms: ["E1"] },
        ],
        ariaLabel: "Junioren F2 Garderobe O1, Gast Team Garderobe E1",
      });
    });

    it("prefers participant semantics over event-level home/away fields", () => {
      expect(
        formatDressingRoomsPresentation({
          eventType: "TOURNAMENT",
          homeCode: "O9",
          awayCode: "E9",
          participantAllocations: [
            {
              participantLabel: "Team A",
              rooms: [{ code: "O1" }],
            },
          ],
        })?.semantics,
      ).toBe("participant");
    });

    it("does not infer Heim/Gast from allocation ordering for non-match events", () => {
      expect(
        formatDressingRoomsPresentation({
          eventType: "TOURNAMENT",
          homeCode: "O1",
          awayCode: "E4",
        }),
      ).toEqual({
        semantics: "neutral",
        sides: [{ rooms: ["O1", "E4"] }],
        ariaLabel: "Garderobe O1, E4",
      });
    });
  });

  describe("buildTodayEventVenuePresentation", () => {
    it("returns only groups backed by real data", () => {
      expect(
        buildTodayEventVenuePresentation({
          eventType: "MATCH",
          location: "Im Brüel, Allschwil",
          pitchCode: "KUNSTRASEN_2",
          homeDressingRoomCode: "O1",
          awayDressingRoomCode: "E4",
        }),
      ).toEqual({
        groups: [
          { kind: "location", label: "Im Brüel, Allschwil" },
          { kind: "pitch", label: "Kunstrasen 2" },
          {
            kind: "dressing-rooms",
            label: "Heim O1 · Gast E4",
            ariaLabel: "Heim Garderobe O1, Gast Garderobe E4",
            dressingRooms: {
              semantics: "home-away",
              sides: [
                { roleLabel: "Heim", rooms: ["O1"] },
                { roleLabel: "Gast", rooms: ["E4"] },
              ],
              ariaLabel: "Heim Garderobe O1, Gast Garderobe E4",
            },
          },
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
