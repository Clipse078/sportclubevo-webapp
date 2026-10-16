/**
 * SCE-TOURNAMENT-PLANNER-01E3D migration integrity (static SQL + schema audit).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-01E3D migration integrity", () => {
  const migration =
    "prisma/migrations/20261016210000_sce_tournament_planner_01e3d_knockout_qualification_mapping/migration.sql";

  it("adds knockout qualification mapping table with structural uniques", () => {
    const sql = read(migration);
    expect(sql).toContain("TournamentKnockoutQualificationMapping");
    expect(sql).toContain("knockoutPhaseId");
    expect(sql).toContain("slotIndexInRound");
    expect(sql).toContain("TournamentQualificationSource_group_rank_unique");
  });

  it("does not perform destructive tournament data operations", () => {
    const sql = read(migration);
    expect(sql).not.toMatch(/DELETE FROM/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
    expect(sql).not.toMatch(/UPDATE\s+"TournamentFixture"/i);
  });

  it("schema exposes mapping model", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toContain("model TournamentKnockoutQualificationMapping");
  });
});
