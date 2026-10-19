import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression for STAGE UAT blocker: 02B app code + Prisma client selecting
 * TournamentPitch.playersPerSide without the 02B migration applied causes
 * P2022 and a full server failure on tournament edit (planung preload).
 */
describe("Tournament edit page — 02B schema coupling", () => {
  it("edit route preloads planung for tenant-organised tournaments", () => {
    const page = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/tournamentcenter/[tournamentId]/edit/page.tsx"),
      "utf8",
    );
    expect(page).toContain("loadTournamentPlanungViewModel");
  });

  it("planung load lists tournament pitches via service that selects playersPerSide", () => {
    const load = readFileSync(
      join(process.cwd(), "lib/tournaments/planung/load-tournament-planung.server.ts"),
      "utf8",
    );
    expect(load).toContain("listTournamentPitches");

    const service = readFileSync(
      join(process.cwd(), "lib/tournament-scheduling/tournament-pitch-service.ts"),
      "utf8",
    );
    expect(service).toMatch(/playersPerSide:\s*true/);
  });

  it("02B migration adds nullable playersPerSide without data rewrite", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "prisma/migrations/20261019120000_sce_tournament_planner_02b_playing_format/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain('"playersPerSide"');
    expect(sql).not.toMatch(/UPDATE\s+"TournamentPitch"/i);
  });

  it("documents guarded STAGE migration apply script for 02B", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts/sce-tournament-planner-02b-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
  });
});

const MIGRATION_NAME = "20261019120000_sce_tournament_planner_02b_playing_format";
