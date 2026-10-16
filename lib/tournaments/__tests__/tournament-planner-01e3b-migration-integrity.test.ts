/**
 * SCE-TOURNAMENT-PLANNER-01E3B migration integrity (static SQL + schema audit).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-01E3B migration integrity", () => {
  const migration =
    "prisma/migrations/20261016200000_sce_tournament_planner_01e3b_group_fixture_relation/migration.sql";

  it("adds nullable tournamentGroupId FK with restrict delete and partial slot uniques", () => {
    const sql = read(migration);
    expect(sql).toContain('"tournamentGroupId" TEXT');
    expect(sql).toContain("TournamentFixture_tournamentGroupId_fkey");
    expect(sql).toMatch(/ON DELETE RESTRICT/i);
    expect(sql).toContain("TournamentFixture_legacy_slot_unique");
    expect(sql).toContain("TournamentFixture_group_slot_unique");
    expect(sql).toContain('WHERE "tournamentGroupId" IS NULL');
    expect(sql).toContain('WHERE "tournamentGroupId" IS NOT NULL');
  });

  it("does not perform destructive fixture/participant/group data operations", () => {
    const sql = read(migration);
    expect(sql).not.toMatch(/DELETE FROM\s+"TournamentFixture"/i);
    expect(sql).not.toMatch(/DELETE FROM\s+"TournamentParticipant"/i);
    expect(sql).not.toMatch(/DELETE FROM\s+"TournamentGroup"/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
    expect(sql).not.toMatch(/UPDATE\s+"TournamentFixture"/i);
    expect(sql).not.toMatch(/INSERT INTO\s+"TournamentGroup"/i);
    expect(sql).not.toMatch(/INSERT INTO\s+"TournamentFixture"/i);
  });

  it("schema exposes nullable group relation on TournamentFixture", () => {
    const schema = read("prisma/schema.prisma");
    const block = schema.match(/model TournamentFixture \{[\s\S]*?\n\}/)?.[0];
    expect(block).toBeDefined();
    expect(block).toContain("tournamentGroupId String?");
    expect(block).toMatch(/onDelete:\s*Restrict/);
    expect(block).toContain('relation("TournamentGroupFixtures"');
  });
});
