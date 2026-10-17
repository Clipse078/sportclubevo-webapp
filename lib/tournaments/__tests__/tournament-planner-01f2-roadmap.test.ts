/**
 * SCE-TOURNAMENT-PLANNER-01F2 roadmap contract tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-01F2 roadmap", () => {
  it("documents schedule optimiser as closed and merged", () => {
    const doc = read("docs/roadmap/SCE-TOURNAMENT-PLANNER-01F2.md");
    expect(doc).toContain("01F2");
    expect(doc).toContain("optimiseTournamentSchedule");
    expect(doc).toContain("OPTIMISER_PURE");
    expect(doc).toMatch(/CLOSED.*ACCEPTED.*MERGED/i);
  });

  it("parent roadmap marks 01F2 closed and 01G next", () => {
    const parent = read("docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md");
    expect(parent).toMatch(/01F2.*CLOSED.*MERGED/i);
    expect(parent).toMatch(/01H.*CLOSED|01I.*CURRENT/i);
    expect(parent).toMatch(/01F1.*CLOSED.*MERGED/i);
  });
});
