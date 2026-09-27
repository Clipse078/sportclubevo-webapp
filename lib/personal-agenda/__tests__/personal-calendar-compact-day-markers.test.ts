import { describe, expect, it } from "vitest";
import { resolvePersonalCalendarCompactDayMarkers } from "../personal-calendar-compact-day-markers";
import type { NormalizedCalendarItem } from "../normalized-calendar-item-types";

function typed(semanticType: NormalizedCalendarItem["semanticType"], id: string): NormalizedCalendarItem {
  return {
    id,
    sourceType: "event",
    sourceId: id,
    semanticType,
    title: "T",
    startAt: new Date("2026-09-01T12:00:00.000Z"),
    allDay: false,
    deepLink: null,
    iconKey: null,
    typeLabel: semanticType,
    ariaLabel: semanticType,
  };
}

describe("SCE-CALENDAR-UX-04 — compact day markers", () => {
  it("returns deterministic semantic markers capped at three", () => {
    const markers = resolvePersonalCalendarCompactDayMarkers([
      typed("TASK", "task:1"),
      typed("MATCH", "match:1"),
      typed("TRAINING", "training:1"),
      typed("MEETING", "meeting:1"),
    ]);
    expect(markers).toEqual(["TRAINING", "MATCH", "MEETING"]);
  });
});
