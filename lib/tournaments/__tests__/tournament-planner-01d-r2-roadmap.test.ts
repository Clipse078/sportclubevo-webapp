/**
 * SCE-TOURNAMENT-PLANNER-01D-R2 — roadmap / ADR documentation integrity.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd());

function readDoc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-01D-R2 documentation", () => {
  it("registers smart generator architecture on programme brief", () => {
    const doc = readDoc("docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md");
    expect(doc).toContain("SMART_TOURNAMENT_GENERATOR");
    expect(doc).toContain("AUTOMATIC_GENERATION_IS_PRIMARY");
    expect(doc).toContain("GROUP_MIX_ONLY");
    expect(doc).toContain("SMART_MIX");
    expect(doc).toContain("01D-R2");
  });

  it("registers 01D-R2 scope on package doc", () => {
    const doc = readDoc("docs/roadmap/SCE-TOURNAMENT-PLANNER-01D.md");
    expect(doc).toContain("01D-R2");
    expect(doc).toContain("SAME_SOURCE_TEAM_MULTIPLE_PARTICIPANTS");
    expect(doc).toContain("FEASIBILITY_REQUIRES_ROUND_ROBIN_SOURCE");
    expect(doc).toContain("FUTURE_KNOCKOUT_QUALIFICATION_MODEL_DEFINED");
  });

  it("updates ADR-014 for TournamentPitch scheduler grid", () => {
    const doc = readDoc("docs/roadmap/05-architecture-decisions.md");
    expect(doc).toContain("TournamentPitch");
    expect(doc).toContain("01D-R1");
  });
});
