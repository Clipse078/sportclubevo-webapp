/**
 * SCE-TOURNAMENT-PLANNER-01G — migration SQL integrity (repo-level gate).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-01G migration integrity", () => {
  const migration =
    "prisma/migrations/20261017120000_sce_tournament_planner_01g_schedule_lock_dimension/migration.sql";

  it("adds nullable scheduleLockDimension enum column (non-destructive)", () => {
    const sql = read(migration);
    expect(sql).toContain('CREATE TYPE "TournamentFixtureScheduleLockDimension"');
    expect(sql).toContain('"scheduleLockDimension"');
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
    expect(sql).not.toMatch(/DELETE FROM/i);
  });

  it("backfills only explicit legacy isLocked=true rows to TIME_AND_PITCH", () => {
    const sql = read(migration);
    expect(sql).toContain("WHERE \"isLocked\" = true");
    expect(sql).toContain("'TIME_AND_PITCH'");
    expect(sql).not.toContain("WHERE \"isLocked\" = false");
    expect(sql).not.toMatch(/SET\s+"isLocked"/i);
  });

  it("schema documents legacy isLocked alongside scheduleLockDimension", () => {
    const schema = read("prisma/schema.prisma");
    const block = schema.match(/model TournamentFixtureAssignment \{[\s\S]*?\n\}/)?.[0];
    expect(block).toBeDefined();
    expect(block).toContain("isLocked");
    expect(block).toContain("scheduleLockDimension");
  });
});
