import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("02 roadmap programme", () => {
  it("documents advanced tournament programme generation successor to 01", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02.md"),
      "utf8",
    );
    expect(doc).toMatch(/SCE-TOURNAMENT-PLANNER-02/);
    expect(doc).toMatch(/01M.*#873|CLOSED.*MERGED/i);
    expect(doc).toMatch(/02A.*02E|02A–02E/i);
    expect(doc).toMatch(/Predefined Spielplan templates/i);
    expect(doc).toMatch(/TP02_CLOSES_AFTER_02E.*YES/i);
    expect(doc).toMatch(/ONE_CANONICAL_PROGRAMME.*YES/i);
    expect(doc).toMatch(/TP01_EVOLUTION_NOT_REPLACEMENT.*YES/i);
    expect(doc).toMatch(/TOURNAMENT_PLANNER_02_STARTED.*YES/i);
    expect(doc).toMatch(/tournament-programme-architecture\.ts/);

    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md"),
      "utf8",
    );
    expect(parent).toMatch(/SCE-TOURNAMENT-PLANNER-02/);
    expect(parent).toMatch(/TOURNAMENT_PLANNER_02_STARTED.*YES/i);
    expect(parent).toMatch(/01M.*CLOSED/i);
  });
});
