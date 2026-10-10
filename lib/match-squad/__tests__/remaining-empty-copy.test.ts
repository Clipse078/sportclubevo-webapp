import { describe, expect, it } from "vitest";
import {
  MATCH_SQUAD_REMAINING_EMPTY_ALL_SELECTED,
  MATCH_SQUAD_REMAINING_EMPTY_NO_ROSTER,
  matchSquadRemainingEmptyMessage,
} from "../remaining-empty-copy";

describe("matchSquadRemainingEmptyMessage", () => {
  it("uses no-roster copy when rosterTotal is 0", () => {
    expect(matchSquadRemainingEmptyMessage(0)).toBe(MATCH_SQUAD_REMAINING_EMPTY_NO_ROSTER);
    expect(matchSquadRemainingEmptyMessage(0)).not.toContain("aufgeboten");
  });

  it("uses all-selected copy when roster exists but none remain", () => {
    expect(matchSquadRemainingEmptyMessage(1)).toBe(MATCH_SQUAD_REMAINING_EMPTY_ALL_SELECTED);
    expect(matchSquadRemainingEmptyMessage(12)).toBe(MATCH_SQUAD_REMAINING_EMPTY_ALL_SELECTED);
  });

  it("does not refer to «aktive Kaderspieler»", () => {
    for (const message of [
      MATCH_SQUAD_REMAINING_EMPTY_NO_ROSTER,
      MATCH_SQUAD_REMAINING_EMPTY_ALL_SELECTED,
    ]) {
      expect(message.toLowerCase()).not.toContain("aktive kaderspieler");
    }
  });
});
