import { describe, expect, it } from "vitest";
import { formatSceTournamentOwnTeamsCompactLabel } from "../tournament-own-teams-display";

describe("formatSceTournamentOwnTeamsCompactLabel", () => {
  it("strips redundant organiser prefix from a single team", () => {
    expect(
      formatSceTournamentOwnTeamsCompactLabel({
        teamNames: ["FC Allschwil Junioren F3"],
        organiserDisplayName: "FC Allschwil",
      }),
    ).toBe("Junioren F3");
  });

  it("joins two teams with a middle dot", () => {
    expect(
      formatSceTournamentOwnTeamsCompactLabel({
        teamNames: ["Junioren F2", "Junioren F3"],
        organiserDisplayName: "FC Allschwil",
      }),
    ).toBe("Junioren F2 · Junioren F3");
  });

  it("summarises three or more teams compactly", () => {
    expect(
      formatSceTournamentOwnTeamsCompactLabel({
        teamNames: ["Junioren F2", "Junioren F3", "Junioren F4"],
        organiserDisplayName: "FC Allschwil",
      }),
    ).toBe("Junioren F2 · +2 Teams");
  });
});
