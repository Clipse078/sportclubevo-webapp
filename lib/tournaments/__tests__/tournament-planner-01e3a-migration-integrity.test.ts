/**
 * SCE-TOURNAMENT-PLANNER-01E3A — migration SQL integrity (repo-level gate).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-01E3A migration integrity", () => {
  const migration =
    "prisma/migrations/20261016190000_sce_tournament_planner_01e3a_competition_phase_qualification/migration.sql";

  it("migration file exists with expected additive topology", () => {
    const sql = read(migration);
    expect(sql).toContain("CREATE TABLE \"TournamentCompetitionConfiguration\"");
    expect(sql).toContain("CREATE TABLE \"TournamentPhase\"");
    expect(sql).toContain("CREATE TABLE \"TournamentGroup\"");
    expect(sql).toContain("CREATE TABLE \"TournamentGroupMembership\"");
    expect(sql).toContain("CREATE TABLE \"TournamentRankingConfiguration\"");
    expect(sql).toContain("CREATE TABLE \"TournamentQualificationSource\"");
    expect(sql).toContain("CREATE TABLE \"TournamentFixtureSide\"");
    expect(sql).toContain("ADD COLUMN \"tournamentPhaseId\"");
    expect(sql).toContain("ALTER COLUMN \"sideAParticipantId\" DROP NOT NULL");
    expect(sql).toContain("ALTER COLUMN \"sideBParticipantId\" DROP NOT NULL");
  });

  it("backfills concrete fixture sides without destructive fixture/participant ops", () => {
    const sql = read(migration);
    expect(sql).toContain("INSERT INTO \"TournamentFixtureSide\"");
    expect(sql).toContain("CONCRETE_PARTICIPANT");
    expect(sql).toContain("sideAParticipantId");
    expect(sql).toContain("sideBParticipantId");
    expect(sql).not.toMatch(/DELETE FROM\s+"TournamentFixture"/i);
    expect(sql).not.toMatch(/DELETE FROM\s+"TournamentParticipant"/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
    expect(sql).not.toMatch(/INSERT INTO\s+"TournamentCompetitionConfiguration"/i);
    expect(sql).not.toMatch(/INSERT INTO\s+"TournamentPhase"/i);
  });

  it("schema retains legacy participant columns on TournamentFixture", () => {
    const schema = read("prisma/schema.prisma");
    const block = schema.match(/model TournamentFixture \{[\s\S]*?\n\}/)?.[0];
    expect(block).toBeDefined();
    expect(block).toContain("sideAParticipantId");
    expect(block).toContain("sideBParticipantId");
    expect(block).toContain("stageKey");
    expect(block).toContain("tournamentPhaseId");
  });
});
