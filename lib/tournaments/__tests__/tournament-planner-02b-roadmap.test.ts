import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SCE-TOURNAMENT-PLANNER-02B roadmap", () => {
  it("documents optional playersPerSide adoption", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02B.md"),
      "utf8",
    );
    expect(doc).toMatch(/02B/i);
    expect(doc).toMatch(/playersPerSide/i);
    expect(doc).toMatch(/PLAYING_FORMAT_OPTIONAL_BY_DEFAULT.*YES/i);
    expect(doc).toMatch(/CLOSED.*ACCEPTED.*MERGED/i);
    expect(doc).toMatch(/PO_UAT_STATUS.*PASS/i);
    expect(doc).toMatch(/MANUAL_UAT_BY_CURSOR.*SKIPPED_PO_OWNED/i);
    expect(doc).toMatch(/02C/i);
    expect(doc).toMatch(/02D/i);
    expect(doc).not.toMatch(/PARTICIPANT_UNITS_IMPLEMENTED.*YES/i);

    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02.md"),
      "utf8",
    );
    expect(parent).toMatch(/02B.*Playing formats/i);
    expect(parent).toMatch(/02A.*CLOSED/i);
    expect(parent).toMatch(/02B_STATUS.*CLOSED.*MERGED/i);
    expect(parent).toMatch(/02C_STARTED.*NO/i);
  });

  it("wires migration for nullable playersPerSide", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "prisma/migrations/20261019120000_sce_tournament_planner_02b_playing_format/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain('"playersPerSide"');
    expect(sql).not.toMatch(/UPDATE/i);
    expect(sql).not.toMatch(/backfill/i);
  });
});
