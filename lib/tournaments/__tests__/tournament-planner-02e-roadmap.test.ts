import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SCE-TOURNAMENT-PLANNER-02E roadmap", () => {
  const doc = readFileSync(
    join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02E.md"),
    "utf8",
  );
  const parent = readFileSync(join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02.md"), "utf8");

  it("documents unified presentation and PO UAT gate", () => {
    expect(doc).toMatch(/SceTournamentFixturePresentation/);
    expect(doc).toMatch(/READY FOR PO UAT/);
    expect(doc).toMatch(/PARALLEL_MATCH_CARD_PATTERN_INTRODUCED = NO/);
    expect(doc).toMatch(/02E-R1|R1.*world-class|canonical VS/i);
    expect(doc).toMatch(/02E-R2|FINAL VISUAL DENSITY & GRID POLISH/i);
    expect(parent).toMatch(/02E.*READY FOR PO UAT/);
  });
});
