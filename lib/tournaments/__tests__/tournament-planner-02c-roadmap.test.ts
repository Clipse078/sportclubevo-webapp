import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SCE-TOURNAMENT-PLANNER-02C roadmap", () => {
  it("documents playing units persistence and boundaries", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02C.md"),
      "utf8",
    );
    expect(doc).toMatch(/02C/i);
    expect(doc).toMatch(/TournamentParticipantUnit/i);
    expect(doc).toMatch(/PARTICIPANT_NEQ_PLAYING_UNIT.*YES/i);
    expect(doc).toMatch(/PLAYING_UNIT_TOURNAMENT_LOCAL.*YES/i);
    expect(doc).toMatch(/EXISTING_TOURNAMENTS_REQUIRE_UNIT_SETUP.*NO/i);
    expect(doc).toMatch(/ROTATION_GENERATOR_IMPLEMENTED.*NO/i);
    expect(doc).toMatch(/MANUAL_UAT_BY_CURSOR.*SKIPPED_PO_OWNED/i);
    expect(doc).toMatch(/IMPLICIT_FULL_TEAM_COMPATIBILITY/i);

    const sql = readFileSync(
      join(
        process.cwd(),
        "prisma/migrations/20261019140000_sce_tournament_planner_02c_participant_playing_units/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("TournamentParticipantUnit");
    expect(sql).not.toMatch(/UPDATE/i);
    expect(sql).not.toMatch(/Team/i);
  });

  it("parent programme doc marks 02C started and 02D next", () => {
    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02.md"),
      "utf8",
    );
    expect(parent).toMatch(/02C.*Participant playing units/i);
    expect(parent).toMatch(/02C_STARTED.*YES/i);
    expect(parent).toMatch(/NEXT_PACKAGE.*02D/i);
  });
});
