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

describe("buildCalendarEventBlockLines", () => {
  it("maps training hierarchy", () => {
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
    expect(lines.secondary).toContain("KR2");
    expect(lines.secondary).toContain("F2");
  });

  it("maps match hierarchy", () => {
    const lines = buildCalendarEventBlockLines(
      item({
        id: "event:1",
        semanticType: "MATCH",
        typeLabel: "Meisterschaft",
        title: "FC Allschwil – Gegner",
        opponentName: "Gegner",
        homeAway: "HOME",
      }),
    );
    expect(lines.primary).toBe("Meisterschaft");
    expect(lines.secondary).toContain("FC Allschwil");
  });

  it("maps task due rows", () => {
    const lines = buildCalendarEventBlockLines(
      item({
        id: "task:1",
        semanticType: "TASK",
        typeLabel: "Aufgabe",
        title: "Trikots vorbereiten",
        allDay: true,
      }),
    );
    expect(lines.primary).toBe("Aufgabe");
    expect(lines.secondary).toBe("Trikots vorbereiten");
    expect(lines.useDueTimePrefix).toBe(true);
  });
});
