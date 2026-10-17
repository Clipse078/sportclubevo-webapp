import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("01H roadmap", () => {
  it("documents Planung workspace package", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01H.md"),
      "utf8",
    );
    expect(doc).toMatch(/01H/);
    expect(doc).toMatch(/Planung/);
    expect(doc).toMatch(/TournamentPlanungViewModel/);
    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md"),
      "utf8",
    );
    expect(parent).toMatch(/01H.*CLOSED|01H CLOSED/i);
    expect(parent).toMatch(/01I.*CLOSED|01J.*NEXT|NOT STARTED/i);
  });
});
