import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("02A roadmap", () => {
  it("documents programme architecture & format model package", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02A.md"),
      "utf8",
    );
    expect(doc).toMatch(/02A/);
    expect(doc).toMatch(/Programme Architecture/i);
    expect(doc).toMatch(/playersPerSide/i);
    expect(doc).toMatch(/HARD_CODED_3V3_6V6_ENUM.*NO/i);
    expect(doc).toMatch(/PARTICIPANT_NEQ_PLAYING_UNIT.*YES/i);
    expect(doc).toMatch(/ROTATION.*FIRST_CLASS|FIRST_CLASS.*ROTATION/i);
    expect(doc).toMatch(/FORCED_INTO_SMART_MIX.*NO/i);
    expect(doc).toMatch(/SCHEMA_CHANGE.*NO/i);
    expect(doc).toMatch(/TOURNAMENT_CREATOR_ADOPTION_REQUIRED.*NO/i);
    expect(doc).toMatch(/MANUAL_UAT_BY_CURSOR.*SKIPPED_PO_OWNED/i);

    const adr = readFileSync(
      join(process.cwd(), "docs/roadmap/05-architecture-decisions.md"),
      "utf8",
    );
    expect(adr).toMatch(/ADR-015/);
    expect(adr).toMatch(/playersPerSide/i);

    const programme = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02.md"),
      "utf8",
    );
    expect(programme).toMatch(/02A/);
  });
});
