import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("01J roadmap", () => {
  it("documents results + rankings package", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01J.md"),
      "utf8",
    );
    expect(doc).toMatch(/01J/);
    expect(doc).toMatch(/result|ranking|progression/i);
    expect(doc).toMatch(/calculateTournamentGroupStandings|group-standings-pure/i);
    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md"),
      "utf8",
    );
    expect(parent).toMatch(/01I.*CLOSED|01I CLOSED/i);
    expect(parent).toMatch(/01J.*CURRENT/i);
    expect(parent).toMatch(/01K.*NEXT|NOT STARTED/i);
  });
});
