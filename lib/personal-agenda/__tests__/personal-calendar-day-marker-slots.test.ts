import { describe, expect, it } from "vitest";
import { resolvePersonalCalendarDayMarkerSlots } from "../personal-calendar-day-marker-slots";
import type { PersonalProgrammeSourceType } from "../personal-programme-types";

function types(...entries: PersonalProgrammeSourceType[]): PersonalProgrammeSourceType[] {
  return entries;
}

describe("SCE-CALENDAR-UX-02 — personal calendar day marker slots", () => {
  it("Training marker — single slot", () => {
    const result = resolvePersonalCalendarDayMarkerSlots(types("TRAINING"));
    expect(result.markerSlots).toEqual(["TRAINING"]);
    expect(result.overflowCount).toBe(0);
  });

  it("Spiel marker — single MATCH slot uses match-red palette downstream", () => {
    const result = resolvePersonalCalendarDayMarkerSlots(types("MATCH"));
    expect(result.markerSlots).toEqual(["MATCH"]);
  });

  it("Turnier marker", () => {
    expect(resolvePersonalCalendarDayMarkerSlots(types("TOURNAMENT")).markerSlots).toEqual(["TOURNAMENT"]);
  });

  it("Veranstaltung marker", () => {
    expect(resolvePersonalCalendarDayMarkerSlots(types("EVENT")).markerSlots).toEqual(["EVENT"]);
  });

  it("mixed activity day — 2 Training + 1 Spiel", () => {
    const result = resolvePersonalCalendarDayMarkerSlots(types("TRAINING", "TRAINING", "MATCH"));
    expect(result.markerSlots).toEqual(["TRAINING", "MATCH", "TRAINING"]);
    expect(result.overflowCount).toBe(0);
  });

  it("aggregates beyond three activities with +N while preserving type diversity first", () => {
    const result = resolvePersonalCalendarDayMarkerSlots(
      types("TRAINING", "TRAINING", "TRAINING", "TRAINING", "MATCH", "TOURNAMENT"),
    );
    expect(result.markerSlots).toEqual(["TRAINING", "MATCH", "TOURNAMENT"]);
    expect(result.overflowCount).toBe(3);
  });

  it("four trainings only — three dots +1", () => {
    const result = resolvePersonalCalendarDayMarkerSlots(types("TRAINING", "TRAINING", "TRAINING", "TRAINING"));
    expect(result.markerSlots).toEqual(["TRAINING", "TRAINING", "TRAINING"]);
    expect(result.overflowCount).toBe(1);
  });
});
