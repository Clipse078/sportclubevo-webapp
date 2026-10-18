/**
 * SCE-TOURNAMENT-PLANNER-01J — migration SQL integrity (repo-level gate).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-01J migration integrity", () => {
  const migration =
    "prisma/migrations/20261018120000_sce_tournament_planner_01j_fixture_results/migration.sql";

  it("adds TournamentFixtureResult additively", () => {
    const sql = read(migration);
    expect(sql).toContain('CREATE TYPE "TournamentFixtureResultState"');
    expect(sql).toContain('"TournamentFixtureResult"');
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
  });

  it("schema documents fixture result revision concurrency", () => {
    const schema = read("prisma/schema.prisma");
    const block = schema.match(/model TournamentFixtureResult \{[\s\S]*?\n\}/)?.[0];
    expect(block).toBeDefined();
    expect(block).toContain("revision");
    expect(block).toContain("previousResultSnapshotJson");
  });
});
