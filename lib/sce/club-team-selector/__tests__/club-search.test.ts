import { describe, expect, it } from "vitest";
import {
  filterSelectableClubsBySearch,
  sortSelectableClubsDeterministic,
} from "../club-search";
import type { SceSelectableClub } from "../types";

const CLUBS: SceSelectableClub[] = [
  {
    id: "1",
    name: "BSC Old Boys",
    shortName: "Old Boys",
    alternativeName: null,
    logoUrl: null,
    status: "active",
    teamCount: 3,
  },
  {
    id: "2",
    name: "FC Basel",
    shortName: null,
    alternativeName: null,
    logoUrl: null,
    status: "active",
    teamCount: 1,
  },
];

describe("SCE club-team selector search", () => {
  it("filters case-insensitively and restores full set when cleared", () => {
    expect(filterSelectableClubsBySearch(CLUBS, "old").map((c) => c.id)).toEqual(["1"]);
    expect(filterSelectableClubsBySearch(CLUBS, "")).toHaveLength(2);
  });

  it("sorts clubs deterministically by name then id", () => {
    const sorted = sortSelectableClubsDeterministic([
      { ...CLUBS[1]!, id: "z" },
      { ...CLUBS[0]!, id: "a" },
    ]);
    expect(sorted[0]?.name).toBe("BSC Old Boys");
    expect(sorted[1]?.name).toBe("FC Basel");
  });
});
