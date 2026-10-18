import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SCE_TOURNAMENT_ACTION_LINK_CLASS,
  SCE_TOURNAMENT_FOCUS_RING_CLASS,
  SCE_TOURNAMENT_SELECT_CLASS,
} from "../sce-tournament-interactive-a11y";

describe("sce-tournament-interactive-a11y", () => {
  it("exports focus-visible and touch-friendly action tokens", () => {
    expect(SCE_TOURNAMENT_FOCUS_RING_CLASS).toContain("focus-visible:ring");
    expect(SCE_TOURNAMENT_ACTION_LINK_CLASS).toContain("min-h-11");
    expect(SCE_TOURNAMENT_SELECT_CLASS).toContain("min-h-11");
  });

  it("Planung surfaces adopt shared interactive tokens", () => {
    const board = readSource("components/admin/tournamentcenter/planung/TournamentPlanungBoard.tsx");
    expect(board).toContain("SCE_TOURNAMENT_FIXTURE_CONTROL_CLASS");

    const output = readSource(
      "components/admin/tournamentcenter/planung/TournamentPlanungSpielplanOutput.tsx",
    );
    expect(output).toContain("SCE_TOURNAMENT_ACTION_LINK_CLASS");
    expect(output).toContain("SCE_TOURNAMENT_SELECT_CLASS");

    const manualMove = readSource(
      "components/admin/tournamentcenter/planung/TournamentPlanungManualMoveDialog.tsx",
    );
    expect(manualMove).toContain("SCE_TOURNAMENT_SELECT_CLASS");
  });

  it("public Spielplan uses lg master / mobile split", () => {
    const pub = readSource("components/public/tournament/PublicTournamentExperience.tsx");
    expect(pub).toMatch(/hidden lg:block/);
    const mobile = readSource("components/sce/tournament/TournamentSpielplanMobileTimeline.tsx");
    expect(mobile).toMatch(/lg:hidden/);
  });
});

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}
