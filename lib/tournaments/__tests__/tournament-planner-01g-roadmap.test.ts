import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("01G roadmap", () => {
  it("documents 01G package and 01H next", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01G.md"),
      "utf8",
    );
    expect(doc).toMatch(/01G/);
    expect(doc).toMatch(/STAGE migration \(01G closure\)|01G closure/i);
    expect(doc).toMatch(/TIME_AND_PITCH/);
    expect(doc).toMatch(/REGENERATION_DISRUPTION_LEX_ORDER/);
    expect(doc).toMatch(/compareRegenerationObjectiveBundles/);
    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md"),
      "utf8",
    );
    expect(parent).toMatch(/01G.*CLOSED|01G = CLOSED|CLOSED \/ ACCEPTED \/ MERGED.*01G/i);
    expect(parent).toMatch(/01H.*CLOSED|01H CLOSED/i);
    expect(parent).toMatch(/01I.*CURRENT|01I = CURRENT/i);
  });
});
