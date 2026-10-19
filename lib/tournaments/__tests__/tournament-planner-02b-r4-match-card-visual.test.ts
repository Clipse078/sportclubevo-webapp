/**
 * SCE-TOURNAMENT-PLANNER-02B-R4 — Feld- und Zeitplan compact match identity (visual-only).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-02B-R4 match card visual", () => {
  it("reuses canonical stacked match identity primitive on planung board cells", () => {
    const compact = read("components/sce/tournament/SceTournamentFixtureCompactMatchup.tsx");
    const shared = read("components/sporting-activity/SceMatchStackedFixtureIdentity.tsx");
    const matchCard = read("components/sporting-activity/SceMatchCard.tsx");

    expect(compact).toContain("SceMatchStackedFixtureIdentity");
    expect(matchCard).toContain("SceMatchStackedFixtureIdentity");
    expect(shared).toContain("data-sce-match-side");
    expect(compact).not.toContain("pairingLabel");
  });

  it("keeps PlayingFormat on pitch columns, not inside board matchup", () => {
    const board = read("components/admin/tournamentcenter/planung/TournamentPlanungBoard.tsx");
    expect(board).toContain("formatHint");
    const compact = read("components/sce/tournament/SceTournamentFixtureCompactMatchup.tsx");
    expect(compact).not.toContain("formatHint");
    expect(compact).not.toContain("playersPerSide");
  });
});
