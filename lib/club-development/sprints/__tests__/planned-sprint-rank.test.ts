import { describe, expect, it } from "vitest";
import { comparePlannedSprintsByRank } from "../planned-sprint-rank-ordering";

describe("comparePlannedSprintsByRank", () => {
  const rankMap = new Map([
    ["p2", 2000],
    ["p1", 1000],
  ]);

  it("orders manually ranked phases before unranked date order", () => {
    const phases = [
      { id: "p3", status: "PLANNED" as const, startsAt: "2026-01-01" },
      { id: "p2", status: "PLANNED" as const, startsAt: "2026-03-01" },
      { id: "p1", status: "PLANNED" as const, startsAt: "2026-02-01" },
    ];
    const sorted = [...phases].sort((a, b) => comparePlannedSprintsByRank(a, b, rankMap));
    expect(sorted.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });
});