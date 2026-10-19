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
    expect(doc).toMatch(/GENERIC_ROTATION_GENERATOR_REQUIRED.*NO/i);
    expect(doc).toMatch(/MANUAL_UAT_BY_CURSOR.*SKIPPED_PO_OWNED/i);
    expect(doc).toMatch(/IMPLICIT_FULL_TEAM_COMPATIBILITY/i);
    expect(doc).toMatch(/READY FOR PO UAT/i);

    const sql = readFileSync(
      join(
        process.cwd(),
        "prisma/migrations/20261019140000_sce_tournament_planner_02c_participant_playing_units/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("TournamentParticipantUnit");
    expect(sql).not.toMatch(/^\s*UPDATE/m);
    expect(sql).not.toMatch(/UPDATE\s+"Team"/i);
  });

  it("parent programme doc marks 02C ready for UAT and predefined-template 02D next", () => {
    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02.md"),
      "utf8",
    );
    expect(parent).toMatch(/02C.*Participant playing units/i);
    expect(parent).toMatch(/02C_STATUS.*READY FOR PO UAT/i);
    expect(parent).toMatch(
      /NEXT_PACKAGE.*02D.*Predefined Spielplan Templates & Instant Generation/i,
    );
    expect(parent).toMatch(/FINAL_PACKAGE.*02E.*Spielplan UX/i);
    expect(parent).toMatch(/TP02_CLOSES_AFTER_02E.*YES/i);
    expect(parent).not.toMatch(/02H/i);
    expect(parent).not.toMatch(/NEXT_PACKAGE.*Rotation Generator/i);
    expect(parent).toMatch(/Fair programme optimiser.*Removed/i);
  });
});
