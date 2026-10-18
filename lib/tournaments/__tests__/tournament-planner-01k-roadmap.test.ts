import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("01K roadmap", () => {
  it("documents publication + sharing package", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01K.md"),
      "utf8",
    );
    expect(doc).toMatch(/01K/);
    expect(doc).toMatch(/public.*projection|Publication/i);
    expect(doc).toMatch(/buildPublicTournamentViewModel/);
    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md"),
      "utf8",
    );
    expect(parent).toMatch(/01J.*CLOSED|01J CLOSED/i);
    expect(parent).toMatch(/01K.*CURRENT|01K.*Publication/i);
    expect(parent).toMatch(/01L.*NEXT|NOT STARTED/i);
  });
});
