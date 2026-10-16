/**
 * SCE-TOURNAMENT-PLANNER-01E3B migration integrity (static SQL audit).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "prisma/migrations/20261016200000_sce_tournament_planner_01e3b_group_fixture_relation/migration.sql",
);

describe("01E3B migration", () => {
  it("adds tournamentGroupId and partial slot uniques", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("tournamentGroupId");
    expect(sql).toContain("TournamentFixture_legacy_slot_unique");
    expect(sql).toContain("TournamentFixture_group_slot_unique");
    expect(sql).not.toContain("DROP TABLE");
  });
});
