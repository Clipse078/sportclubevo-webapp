import { describe, expect, it } from "vitest";
import { resolveSceTournamentHauptteamDisplayName } from "../tournament-hauptteam-display";

describe("resolveSceTournamentHauptteamDisplayName", () => {
  it("strips redundant organiser club prefix from team label", () => {
    expect(
      resolveSceTournamentHauptteamDisplayName({
        hauptteamName: "FC Allschwil Junioren F3",
        organiserDisplayName: "FC Allschwil",
      }),
    ).toBe("Junioren F3");
  });

  it("returns full team name when organiser does not prefix the team", () => {
    expect(
      resolveSceTournamentHauptteamDisplayName({
        hauptteamName: "FC Allschwil Junioren F2",
        organiserDisplayName: "FC Arisdorf",
      }),
    ).toBe("FC Allschwil Junioren F2");
  });

  it("returns undefined when team equals organiser", () => {
    expect(
      resolveSceTournamentHauptteamDisplayName({
        hauptteamName: "FC Allschwil",
        organiserDisplayName: "FC Allschwil",
      }),
    ).toBeUndefined();
  });
});
