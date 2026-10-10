import { describe, expect, it } from "vitest";
import {
  getMatchParticipationStatusPresentation,
  mapParticipationStatusToMatchPresentationStatus,
} from "../match-availability-presentation";

describe("match-availability-presentation", () => {
  it("maps participation statuses to canonical Match labels", () => {
    expect(getMatchParticipationStatusPresentation("YES").label).toBe("Verfügbar");
    expect(getMatchParticipationStatusPresentation("NO").label).toBe("Nicht verfügbar");
    expect(getMatchParticipationStatusPresentation("MAYBE").label).toBe("Unsicher");
    expect(getMatchParticipationStatusPresentation("OPEN").label).toBe("Offen");
    expect(getMatchParticipationStatusPresentation(null).label).toBe("Offen");
  });

  it("assigns semantic tones", () => {
    expect(getMatchParticipationStatusPresentation("YES").tone).toBe("success");
    expect(getMatchParticipationStatusPresentation("NO").tone).toBe("danger");
    expect(getMatchParticipationStatusPresentation("MAYBE").tone).toBe("warning");
    expect(getMatchParticipationStatusPresentation("OPEN").tone).toBe("muted");
  });

  it("assigns icon + label for text-not-color-only semantics", () => {
    expect(getMatchParticipationStatusPresentation("YES")).toMatchObject({
      label: "Verfügbar",
      icon: "check",
    });
    expect(getMatchParticipationStatusPresentation("NO")).toMatchObject({
      label: "Nicht verfügbar",
      icon: "x",
    });
    expect(getMatchParticipationStatusPresentation("MAYBE")).toMatchObject({
      label: "Unsicher",
      icon: "help",
    });
    expect(getMatchParticipationStatusPresentation("OPEN")).toMatchObject({
      label: "Offen",
      icon: "circle",
    });
  });

  it("preserves MAYBE vs OPEN presentation status", () => {
    expect(mapParticipationStatusToMatchPresentationStatus("OPEN")).toBe("OPEN");
    expect(mapParticipationStatusToMatchPresentationStatus("MAYBE")).toBe("MAYBE");
    expect(mapParticipationStatusToMatchPresentationStatus(null)).toBe("OPEN");
  });

  it("marks conflict only for selected unavailable", () => {
    expect(
      getMatchParticipationStatusPresentation("NO", {
        selected: true,
        availability: "UNAVAILABLE",
      }).isConflictRelevant,
    ).toBe(true);
    expect(
      getMatchParticipationStatusPresentation("MAYBE", {
        selected: true,
        availability: "UNKNOWN",
      }).isConflictRelevant,
    ).toBe(false);
    expect(
      getMatchParticipationStatusPresentation("MAYBE", {
        selected: false,
        availability: "UNKNOWN",
      }).isConflictRelevant,
    ).toBe(false);
  });
});
