import { describe, expect, it } from "vitest";
import type { MatchSquadPlayerPresentation } from "../types";

function deriveCountsForTest(players: MatchSquadPlayerPresentation[]) {
  let available = 0;
  let unavailable = 0;
  let maybe = 0;
  let open = 0;

  for (const player of players) {
    switch (player.presentationStatus) {
      case "AVAILABLE":
        available += 1;
        break;
      case "UNAVAILABLE":
        unavailable += 1;
        break;
      case "MAYBE":
        maybe += 1;
        break;
      case "OPEN":
      default:
        open += 1;
        break;
    }
  }

  return { rosterTotal: players.length, available, unavailable, maybe, open };
}

function player(
  presentationStatus: MatchSquadPlayerPresentation["presentationStatus"],
): MatchSquadPlayerPresentation {
  return {
    personId: "p1",
    displayName: "Test",
    shirtNumber: 1,
    sortOrder: 1,
    rosterEligible: true,
    rosterIneligibleLabel: null,
    rosterStatus: "ACTIVE",
    availability:
      presentationStatus === "AVAILABLE"
        ? "AVAILABLE"
        : presentationStatus === "UNAVAILABLE"
          ? "UNAVAILABLE"
          : "UNKNOWN",
    availabilityLabel: "x",
    presentationStatus,
    presentationTone: "muted",
    presentationIcon: "circle",
    participationStatus: null,
    participationNote: null,
    selected: false,
    availabilityConflict: false,
    staleRosterSelection: false,
    canSelect: true,
    canRemove: false,
  };
}

describe("match squad presentation counts", () => {
  it("available + unavailable + maybe + open equals roster total", () => {
    const players = [
      player("AVAILABLE"),
      player("UNAVAILABLE"),
      player("MAYBE"),
      player("OPEN"),
      player("OPEN"),
      player("MAYBE"),
    ];
    const counts = deriveCountsForTest(players);
    expect(counts.available + counts.unavailable + counts.maybe + counts.open).toBe(
      counts.rosterTotal,
    );
    expect(counts).toEqual({
      rosterTotal: 6,
      available: 1,
      unavailable: 1,
      maybe: 2,
      open: 2,
    });
  });
});
