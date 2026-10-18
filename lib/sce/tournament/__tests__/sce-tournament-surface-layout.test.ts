import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SCE_TOURNAMENT_FIXTURE_CARD_SHELL_CLASS,
  SCE_TOURNAMENT_ROUND_SURFACE_CLASS,
  SCE_TOURNAMENT_WORKSPACE_SURFACE_CLASS,
} from "../sce-tournament-surface-layout";

const repoRoot = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("sce-tournament-surface-layout", () => {
  it("uses canonical dense workspace and match-card fixture tokens", () => {
    expect(SCE_TOURNAMENT_WORKSPACE_SURFACE_CLASS).toContain("--sce-surface-dense");
    expect(SCE_TOURNAMENT_ROUND_SURFACE_CLASS).toContain("--sce-surface-standard");
    expect(SCE_TOURNAMENT_FIXTURE_CARD_SHELL_CLASS).toContain("--sce-match-card-surface");
  });

  it("does not rely on transparent legacy surface-elevated overlays in tournament fixture shells", () => {
    const card = readSource("components/sce/tournament/SceTournamentFixtureCard.tsx");
    expect(card).not.toContain("surface-elevated]/90");
    expect(card).toContain("SCE_TOURNAMENT_FIXTURE_CARD_SHELL_CLASS");

    const planungList = readSource(
      "components/admin/tournamentcenter/planung/TournamentPlanungScheduleList.tsx",
    );
    expect(planungList).not.toContain("surface-elevated]/90");
    expect(planungList).toContain("SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS");

    const spielplanOutput = readSource(
      "components/admin/tournamentcenter/planung/TournamentPlanungSpielplanOutput.tsx",
    );
    expect(spielplanOutput).toContain("SCE_TOURNAMENT_WORKSPACE_SURFACE_CLASS");
    expect(spielplanOutput).not.toContain("bg-[var(--surface-elevated)]");
  });
});
