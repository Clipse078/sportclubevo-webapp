/**
 * SCE-TOURNAMENT-PLANNER-01H-R1 — migration SQL integrity (repo-level gate).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-01H-R1 migration integrity", () => {
  const migration =
    "prisma/migrations/20261017140000_sce_tournament_planner_01h_r1_composer_generation_prefs/migration.sql";

  it("adds composer generation preference columns (non-destructive)", () => {
    const sql = read(migration);
    expect(sql).toContain('CREATE TYPE "TournamentFixtureHomeAwayRelevance"');
    expect(sql).toContain('"fixtureHomeAwayRelevance"');
    expect(sql).toContain('"roundRobinMeetingsPerOpponent"');
    expect(sql).toContain('"automaticGroupCount"');
    expect(sql).toContain('"knockoutQualifiersPerGroup"');
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
    expect(sql).not.toMatch(/DELETE FROM/i);
  });

  it("schema documents persisted generation preferences on competition configuration", () => {
    const schema = read("prisma/schema.prisma");
    const block = schema.match(
      /model TournamentCompetitionConfiguration \{[\s\S]*?\n\}/,
    )?.[0];
    expect(block).toBeDefined();
    expect(block).toContain("fixtureHomeAwayRelevance");
    expect(block).toContain("roundRobinMeetingsPerOpponent");
    expect(block).toContain("automaticGroupCount");
    expect(block).toContain("knockoutQualifiersPerGroup");
  });
});
