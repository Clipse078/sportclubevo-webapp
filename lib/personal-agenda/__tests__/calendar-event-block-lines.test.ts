import { describe, expect, it } from "vitest";
import { buildCalendarEventBlockLines } from "../calendar-event-block-lines";
import type { NormalizedCalendarItem } from "../normalized-calendar-item-types";

function item(
  overrides: Partial<NormalizedCalendarItem> & Pick<NormalizedCalendarItem, "semanticType" | "id">,
): NormalizedCalendarItem {
  return {
    sourceType: "event",
    sourceId: "1",
    title: "Title",
    startAt: new Date("2026-09-10T10:00:00.000Z"),
    allDay: false,
    deepLink: null,
    iconKey: null,
    typeLabel: "Label",
    ariaLabel: "Label",
    ...overrides,
  };
}

const tenantOptions = { tenantDisplayNames: ["FC Allschwil"] };

describe("buildCalendarEventBlockLines — UX-03R1", () => {
  describe("TRAINING", () => {
    it("prioritizes team and series without repeating Training", () => {
      const lines = buildCalendarEventBlockLines(
        item({
          id: "training-session:1",
          semanticType: "TRAINING",
          typeLabel: "Training",
          title: "KR2",
          team: { name: "F2" },
        }),
      );
      expect(lines.primary).toBe("Training");
      expect(lines.secondary).toBe("F2 · KR2");
      expect(lines.secondary?.toLowerCase()).not.toContain("training");
    });

    it("includes facility only when available", () => {
      const withLocation = buildCalendarEventBlockLines(
        item({
          id: "training-session:2",
          semanticType: "TRAINING",
          typeLabel: "Training",
          title: "KR2",
          team: { name: "F2" },
          location: "Kunstrasen 1",
        }),
      );
      expect(withLocation.secondary).toBe("F2 · KR2 · Kunstrasen 1");

      const withoutLocation = buildCalendarEventBlockLines(
        item({
          id: "training-session:3",
          semanticType: "TRAINING",
          typeLabel: "Training",
          title: "KR2",
          team: { name: "F2" },
        }),
      );
      expect(withoutLocation.secondary).toBe("F2 · KR2");
    });

    it("strips redundant training words from noisy titles", () => {
      const lines = buildCalendarEventBlockLines(
        item({
          id: "training-session:4",
          semanticType: "TRAINING",
          typeLabel: "Training",
          title: "Junioren F2 Training",
          team: { name: "F2" },
        }),
        tenantOptions,
      );
      expect(lines.secondary).toBe("F2");
    });
  });

  describe("MATCH", () => {
    it("prioritizes opponent and home/away", () => {
      const lines = buildCalendarEventBlockLines(
        item({
          id: "event:1",
          semanticType: "MATCH",
          typeLabel: "Meisterschaft",
          title: "FC Allschwil – Gegner FC",
          opponentName: "Gegner FC",
          homeAway: "HOME",
        }),
        tenantOptions,
      );
      expect(lines.primary).toBe("Meisterschaft");
      expect(lines.secondary).toBe("vs Gegner FC · H");
      expect(lines.secondary).not.toContain("FC Allschwil");
    });
  });

  describe("TOURNAMENT", () => {
    it("avoids Turnier / Turnier redundancy", () => {
      const lines = buildCalendarEventBlockLines(
        item({
          id: "event:2",
          semanticType: "TOURNAMENT",
          typeLabel: "Turnier",
          title: "Turnier",
          team: { name: "F2" },
          location: "Basel",
        }),
        tenantOptions,
      );
      expect(lines.primary).toBe("Turnier");
      expect(lines.secondary).toBe("F2 · Basel");
      expect(lines.secondary?.toLowerCase()).not.toMatch(/^turnier\b/);
    });
  });

  describe("EVENT", () => {
    it("uses meaningful title with location context", () => {
      const lines = buildCalendarEventBlockLines(
        item({
          id: "event:3",
          semanticType: "EVENT",
          typeLabel: "Veranstaltung",
          title: "Sommerfest",
          location: "Clubhaus",
        }),
      );
      expect(lines.primary).toBe("Sommerfest");
      expect(lines.secondary).toBe("Clubhaus");
    });
  });

  describe("MEETING", () => {
    it("keeps meeting title with organisational context", () => {
      const lines = buildCalendarEventBlockLines(
        item({
          id: "meeting:1",
          semanticType: "MEETING",
          typeLabel: "Meeting",
          title: "Trainersitzung",
          contextLabel: "Meeting · Organisator",
          location: "Besprechungszimmer",
        }),
      );
      expect(lines.primary).toBe("Trainersitzung");
      expect(lines.secondary).toContain("Besprechungszimmer");
    });
  });

  describe("TASK", () => {
    it("puts task title on the primary line", () => {
      const lines = buildCalendarEventBlockLines(
        item({
          id: "task:1",
          semanticType: "TASK",
          typeLabel: "Aufgabe",
          title: "Trikots vorbereiten",
          allDay: true,
        }),
      );
      expect(lines.primary).toBe("Trikots vorbereiten");
      expect(lines.secondary).toBeUndefined();
      expect(lines.useDueTimePrefix).toBe(true);
    });
  });

  describe("tenant context", () => {
    it("does not mechanically repeat tenant name in match fixtures", () => {
      const lines = buildCalendarEventBlockLines(
        item({
          id: "event:4",
          semanticType: "MATCH",
          typeLabel: "Spiel",
          title: "FC Allschwil – FC Rival",
          opponentName: "FC Rival",
        }),
        tenantOptions,
      );
      expect(lines.secondary).toBe("vs FC Rival");
    });
  });
});
