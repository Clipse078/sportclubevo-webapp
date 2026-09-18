import { describe, expect, it } from "vitest";
import {
  TOURNAMENT_ORGANIZER_LEGACY_PICKER_ID,
  organizerNameFromPickerSelection,
  organizerPickerSelectionFromTournament,
} from "../organizer-picker-state";

describe("organizer-picker-state (TURNIERE-UX-02A)", () => {
  it("returns null when tournament has no organizer", () => {
    expect(
      organizerPickerSelectionFromTournament({
        organizerName: null,
        organizerLogoUrl: null,
        organizerExternalClubId: null,
      }),
    ).toBeNull();
  });

  it("maps canonical external club selection from DTO", () => {
    expect(
      organizerPickerSelectionFromTournament({
        organizerName: "FC Aesch",
        organizerLogoUrl: "https://cdn/aesch.png",
        organizerExternalClubId: "club-aesch",
      }),
    ).toEqual({
      id: "club-aesch",
      name: "FC Aesch",
      shortName: null,
      logoUrl: "https://cdn/aesch.png",
    });
  });

  it("uses legacy picker id for unlinked organizer text (backward compatibility)", () => {
    expect(
      organizerPickerSelectionFromTournament({
        organizerName: "Legacy Gastgeber",
        organizerLogoUrl: null,
        organizerExternalClubId: null,
      }),
    ).toEqual({
      id: TOURNAMENT_ORGANIZER_LEGACY_PICKER_ID,
      name: "Legacy Gastgeber",
      shortName: null,
      logoUrl: null,
    });
  });

  it("persists canonical club name from picker selection", () => {
    expect(
      organizerNameFromPickerSelection({
        id: "club-allschwil",
        name: "FC Allschwil",
        shortName: null,
        logoUrl: null,
      }),
    ).toBe("FC Allschwil");
  });

  it("preserves legacy organizer name on save without directory id", () => {
    expect(
      organizerNameFromPickerSelection({
        id: TOURNAMENT_ORGANIZER_LEGACY_PICKER_ID,
        name: "Legacy Gastgeber",
        shortName: null,
        logoUrl: null,
      }),
    ).toBe("Legacy Gastgeber");
  });
});
