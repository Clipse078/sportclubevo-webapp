import { describe, expect, it } from "vitest";
import { compareTasksByUnplannedRank } from "../unplanned-task-rank";

describe("compareTasksByUnplannedRank", () => {
  const rankMap = new Map<string, number>([
    ["a", 1000],
    ["b", 2000],
    ["c", 3000],
  ]);

  it("sorts by rank ascending when both ranked", () => {
    expect(
      compareTasksByUnplannedRank({ id: "b", updatedAt: new Date() }, { id: "a", updatedAt: new Date() }, rankMap),
    ).toBeGreaterThan(0);
  });

  it("puts ranked tasks before unranked tasks", () => {
    expect(
      compareTasksByUnplannedRank({ id: "a", updatedAt: new Date() }, { id: "z", updatedAt: new Date() }, rankMap),
    ).toBeLessThan(0);
  });
});