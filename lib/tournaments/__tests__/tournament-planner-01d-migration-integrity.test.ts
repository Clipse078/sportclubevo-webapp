/**
 * SCE-TOURNAMENT-PLANNER-01D — migration chain integrity (STAGE → feature HEAD).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-01D migration integrity", () => {
  const migration01b =
    "prisma/migrations/20261016140000_sce_tournament_planner_01b_fixture_schedule_foundation/migration.sql";
  const migration01dR1 =
    "prisma/migrations/20261016160000_sce_tournament_planner_01d_r1_tournament_pitch_break/migration.sql";
  const migration01dR2 =
    "prisma/migrations/20261016180000_sce_tournament_planner_01d_r2_participant_identity/migration.sql";

  it("01B introduces TournamentFixtureAssignment with facilityResourceId", () => {
    const sql = read(migration01b);
    expect(sql).toContain("CREATE TABLE \"TournamentFixtureAssignment\"");
    expect(sql).toContain("\"facilityResourceId\" TEXT NOT NULL");
    expect(sql).not.toContain("tournamentPitchId");
  });

  it("01D-R1 adds TournamentPitch/break and moves assignments to tournamentPitchId", () => {
    const sql = read(migration01dR1);
    expect(sql).toContain("CREATE TABLE \"TournamentPitch\"");
    expect(sql).toContain("CREATE TABLE \"TournamentBreak\"");
    expect(sql).toContain("DROP COLUMN \"facilityResourceId\"");
    expect(sql).toContain("ADD COLUMN \"tournamentPitchId\" TEXT NOT NULL");
    expect(sql).not.toContain("DELETE FROM");
    expect(sql).not.toContain("TRUNCATE");
  });

  it("01D-R2 drops team uniqueness only (non-destructive)", () => {
    const sql = read(migration01dR2);
    expect(sql).toContain("DROP INDEX IF EXISTS \"TournamentParticipant_eventId_teamId_key\"");
    expect(sql).not.toMatch(/DROP TABLE/i);
  });

  it("schema matches assignment FK target after R1", () => {
    const schema = read("prisma/schema.prisma");
    const block = schema.match(/model TournamentFixtureAssignment \{[\s\S]*?\n\}/)?.[0];
    expect(block).toBeDefined();
    expect(block).toContain("tournamentPitchId String");
    expect(block).not.toContain("facilityResourceId");
  });
});
