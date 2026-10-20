import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SCE-TOURNAMENT-PLANNER-02E roadmap", () => {
  const doc = readFileSync(
    join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02E.md"),
    "utf8",
  );
  const parent = readFileSync(join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02.md"), "utf8");

  it("documents unified presentation and PO UAT closure", () => {
    expect(doc).toMatch(/SceTournamentFixturePresentation/);
    expect(doc).toMatch(/PO_UAT.*PASS/i);
    expect(doc).toMatch(/02E_PACKAGE_CLOSED.*YES/i);
    expect(doc).toMatch(/CLOSED \/ ACCEPTED/i);
    expect(doc).toMatch(/PARALLEL_MATCH_CARD_PATTERN_INTRODUCED = NO/);
    expect(doc).toMatch(/STANDARD_USES_CANONICAL_PRESENTATION.*YES/i);
    expect(doc).toMatch(/COMPACT_USES_CANONICAL_PRESENTATION.*YES/i);
    expect(doc).toMatch(/GRID_USES_CANONICAL_PRESENTATION.*YES/i);
    expect(doc).toMatch(/ONE_CANONICAL_VS_PRIMITIVE.*YES/i);
    expect(doc).toMatch(/02E-R1|world-class unified Spielplan/i);
    expect(doc).toMatch(/02E-R2|FINAL VISUAL DENSITY & GRID POLISH/i);
    expect(doc).toMatch(/GRID_TIME_OWNERSHIP.*MATRIX_ROW/i);
    expect(doc).toMatch(/MANUAL_UAT_BY_CURSOR.*SKIPPED_PO_OWNED/i);
    expect(parent).toMatch(/02E.*CLOSED \/ ACCEPTED/i);
  });
});
