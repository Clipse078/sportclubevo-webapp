import { describe, expect, it } from "vitest";
import {
  PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL,
  personalProgrammeSourceGermanLabel,
  programmeActivityKindGermanLabel,
  resolveProgrammeActivityDisplayTypeLabel,
} from "../programme-activity-german-labels";

describe("programme activity German type labels", () => {
  it("maps all five programme activity kinds", () => {
    expect(programmeActivityKindGermanLabel("TRAINING")).toBe("Training");
    expect(programmeActivityKindGermanLabel("MATCH")).toBe("Spiel");
    expect(programmeActivityKindGermanLabel("TOURNAMENT")).toBe("Turnier");
    expect(programmeActivityKindGermanLabel("CLUB_EVENT")).toBe("Veranstaltung");
  });

  it("maps personal programme source types including meetings", () => {
    expect(personalProgrammeSourceGermanLabel("MEETING")).toBe("Sitzung");
    expect(personalProgrammeSourceGermanLabel("EVENT")).toBe("Veranstaltung");
  });

  it("normalizes technical enum strings to German labels", () => {
    expect(
      resolveProgrammeActivityDisplayTypeLabel({
        typeLabel: "TRAINING",
      }),
    ).toBe("Training");
    expect(
      resolveProgrammeActivityDisplayTypeLabel({
        typeLabel: "SPIEL",
      }),
    ).toBe("Spiel");
    expect(
      resolveProgrammeActivityDisplayTypeLabel({
        semanticType: "MEETING",
        typeLabel: "Meeting",
      }),
    ).toBe("Sitzung");
  });

  it("exposes stable constants for calendar surfaces", () => {
    expect(PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL).toMatchObject({
      TRAINING: "Training",
      MATCH: "Spiel",
      TOURNAMENT: "Turnier",
      MEETING: "Sitzung",
      CLUB_EVENT: "Veranstaltung",
    });
  });
});
