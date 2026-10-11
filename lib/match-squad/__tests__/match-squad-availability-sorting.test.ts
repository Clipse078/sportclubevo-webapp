import { describe, expect, it } from "vitest";
import { getMatchAvailabilitySortPriority } from "../match-availability-presentation";
import {
  compareMatchSquadPlayersByPresentationOrder,
  sortMatchSquadPlayersForPresentation,
} from "../match-squad-presentation-order";
import type { MatchSquadPlayerPresentation } from "../types";

function player(
  overrides: Partial<MatchSquadPlayerPresentation> & Pick<MatchSquadPlayerPresentation, "personId">,
): MatchSquadPlayerPresentation {
  return {
    displayName: overrides.displayName ?? overrides.personId,
    shirtNumber: overrides.shirtNumber ?? null,
    sortOrder: overrides.sortOrder ?? 0,
    rosterEligible: true,
    rosterIneligibleLabel: null,
    rosterStatus: "ACTIVE",
    availability: "UNKNOWN",
    availabilityLabel: "Offen",
    presentationStatus: "OPEN",
    presentationTone: "muted",
    presentationIcon: "circle",
    participationStatus: null,
    participationNote: null,
    responseSource: null,
    responseProvenanceLabel: null,
    selected: false,
    availabilityConflict: false,
    staleRosterSelection: false,
    canSelect: true,
    canRemove: false,
    ...overrides,
  };
}

function statuses(players: MatchSquadPlayerPresentation[]): string[] {
  return players.map((p) => p.presentationStatus);
}

describe("getMatchAvailabilitySortPriority", () => {
  it("assigns canonical presentation priorities", () => {
    expect(getMatchAvailabilitySortPriority("AVAILABLE")).toBe(1);
    expect(getMatchAvailabilitySortPriority("MAYBE")).toBe(2);
    expect(getMatchAvailabilitySortPriority("OPEN")).toBe(3);
    expect(getMatchAvailabilitySortPriority("UNAVAILABLE")).toBe(4);
  });
});

describe("sortMatchSquadPlayersForPresentation", () => {
  it("A — leaves already ordered AVAILABLE → MAYBE → OPEN → NO unchanged", () => {
    const input = [
      player({ personId: "a", presentationStatus: "AVAILABLE", sortOrder: 1 }),
      player({ personId: "b", presentationStatus: "MAYBE", sortOrder: 2 }),
      player({ personId: "c", presentationStatus: "OPEN", sortOrder: 3 }),
      player({ personId: "d", presentationStatus: "UNAVAILABLE", sortOrder: 4 }),
    ];
    const sorted = sortMatchSquadPlayersForPresentation(input);
    expect(statuses(sorted)).toEqual(["AVAILABLE", "MAYBE", "OPEN", "UNAVAILABLE"]);
    expect(sorted.map((p) => p.personId)).toEqual(["a", "b", "c", "d"]);
  });

  it("B — reorders NO, OPEN, MAYBE, AVAILABLE to canonical order", () => {
    const input = [
      player({ personId: "no", presentationStatus: "UNAVAILABLE", sortOrder: 1 }),
      player({ personId: "open", presentationStatus: "OPEN", sortOrder: 2 }),
      player({ personId: "maybe", presentationStatus: "MAYBE", sortOrder: 3 }),
      player({ personId: "yes", presentationStatus: "AVAILABLE", sortOrder: 4 }),
    ];
    const sorted = sortMatchSquadPlayersForPresentation(input);
    expect(sorted.map((p) => p.personId)).toEqual(["yes", "maybe", "open", "no"]);
  });

  it("C — PO finding: OPEN before UNAVAILABLE", () => {
    const input = [
      player({ personId: "no", presentationStatus: "UNAVAILABLE", sortOrder: 1 }),
      player({ personId: "open", presentationStatus: "OPEN", sortOrder: 2 }),
    ];
    const sorted = sortMatchSquadPlayersForPresentation(input);
    expect(sorted.map((p) => p.personId)).toEqual(["open", "no"]);
  });

  it("D — missing ParticipationResponse (OPEN) sorts before NO", () => {
    const input = [
      player({
        personId: "no",
        presentationStatus: "UNAVAILABLE",
        participationStatus: "NO",
        sortOrder: 1,
      }),
      player({
        personId: "missing",
        presentationStatus: "OPEN",
        participationStatus: null,
        sortOrder: 2,
      }),
    ];
    const sorted = sortMatchSquadPlayersForPresentation(input);
    expect(sorted.map((p) => p.personId)).toEqual(["missing", "no"]);
  });

  it("E — deterministic secondary order for same status (sortOrder, shirt, name)", () => {
    const input = [
      player({
        personId: "p3",
        presentationStatus: "UNAVAILABLE",
        displayName: "SCE Testspieler 03",
        sortOrder: 3,
        shirtNumber: 3,
      }),
      player({
        personId: "p2",
        presentationStatus: "UNAVAILABLE",
        displayName: "SCE Testspieler 02",
        sortOrder: 2,
        shirtNumber: 2,
      }),
    ];
    const sorted = sortMatchSquadPlayersForPresentation(input);
    expect(sorted.map((p) => p.displayName)).toEqual([
      "SCE Testspieler 02",
      "SCE Testspieler 03",
    ]);
  });

  it("uses display name when sortOrder and shirt match", () => {
    const a = player({
      personId: "a",
      presentationStatus: "OPEN",
      displayName: "Zebra",
      sortOrder: 1,
      shirtNumber: 7,
    });
    const b = player({
      personId: "b",
      presentationStatus: "OPEN",
      displayName: "Alpha",
      sortOrder: 1,
      shirtNumber: 7,
    });
    expect(compareMatchSquadPlayersByPresentationOrder(a, b)).toBeGreaterThan(0);
  });
});

describe("Match Squad group boundary (presentation sort is per-group only)", () => {
  it("does not merge selected and remaining when sorting independently", () => {
    const selected = sortMatchSquadPlayersForPresentation([
      player({
        personId: "sel-no",
        presentationStatus: "UNAVAILABLE",
        selected: true,
        availabilityConflict: true,
        sortOrder: 1,
      }),
    ]);
    const remaining = sortMatchSquadPlayersForPresentation([
      player({
        personId: "rem-yes",
        presentationStatus: "AVAILABLE",
        selected: false,
        sortOrder: 2,
      }),
    ]);

    expect(selected).toHaveLength(1);
    expect(selected[0]?.personId).toBe("sel-no");
    expect(selected[0]?.selected).toBe(true);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.personId).toBe("rem-yes");
    expect(remaining[0]?.presentationStatus).toBe("AVAILABLE");
  });

  it("selected + NO stays selected and sorts after OPEN/MAYBE/AVAILABLE within AUFGEBOTEN", () => {
    const selected = sortMatchSquadPlayersForPresentation([
      player({
        personId: "no",
        presentationStatus: "UNAVAILABLE",
        selected: true,
        availabilityConflict: true,
        sortOrder: 1,
      }),
      player({ personId: "open", presentationStatus: "OPEN", selected: true, sortOrder: 2 }),
      player({ personId: "maybe", presentationStatus: "MAYBE", selected: true, sortOrder: 3 }),
      player({
        personId: "yes",
        presentationStatus: "AVAILABLE",
        selected: true,
        sortOrder: 4,
      }),
    ]);
    expect(selected.map((p) => p.personId)).toEqual(["yes", "maybe", "open", "no"]);
    expect(selected.find((p) => p.personId === "no")).toMatchObject({
      selected: true,
      presentationStatus: "UNAVAILABLE",
      availabilityConflict: true,
    });
  });
});

describe("UAT B1 remaining players regression (cmrzhj3je006a04kwhbepxvdz semantics)", () => {
  it("orders SCE Testspieler 05 (Offen) before 02/03 (Nicht verfügbar)", () => {
    const remaining = sortMatchSquadPlayersForPresentation([
      player({
        personId: "p02",
        displayName: "SCE Testspieler 02",
        presentationStatus: "UNAVAILABLE",
        participationStatus: "NO",
        sortOrder: 2,
        shirtNumber: 2,
        canSelect: false,
      }),
      player({
        personId: "p03",
        displayName: "SCE Testspieler 03",
        presentationStatus: "UNAVAILABLE",
        participationStatus: "NO",
        sortOrder: 3,
        shirtNumber: 3,
        canSelect: false,
      }),
      player({
        personId: "p05",
        displayName: "SCE Testspieler 05",
        presentationStatus: "OPEN",
        participationStatus: null,
        sortOrder: 5,
        shirtNumber: 5,
        canSelect: true,
      }),
    ]);
    expect(remaining.map((p) => p.displayName)).toEqual([
      "SCE Testspieler 05",
      "SCE Testspieler 02",
      "SCE Testspieler 03",
    ]);
  });
});
