import { describe, expect, it } from "vitest";
import { createEmptyMatchComposerDraft } from "@/lib/matchcenter/composer/match-composer-draft-types";
import {
  computeMatchCreateTabErrors,
  firstInvalidMatchCreateTab,
} from "@/lib/matchcenter/match-create-validation";
import {
  resolveMatchCreateStepValid,
  validateMatchCreateWorkflowStep,
} from "@/lib/matchcenter/match-create-step-validation";
import { buildMatchCreatePreviewSummary } from "@/lib/matchcenter/composer/build-match-create-preview-pair";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function validHomeMatchDraft(): ReturnType<typeof createEmptyMatchComposerDraft> {
  const draft = createEmptyMatchComposerDraft();
  draft.teamId = "team-1";
  draft.opponentExternalClubId = "club-ext-1";
  draft.opponentName = "FC Rival";
  draft.startAt = "2026-10-14T18:00";
  draft.homeAway = "HOME";
  draft.resources = [];
  return draft;
}

describe("SCE-ACTIVITY-CREATE-01E-R5 — opponent club-only + optional resources", () => {
  it("HOME match with zero resources passes commit tab validation", () => {
    const draft = validHomeMatchDraft();
    const errors = computeMatchCreateTabErrors(draft);
    expect(errors.ressourcen).toBeUndefined();
    expect(firstInvalidMatchCreateTab(errors)).toBeNull();
  });

  it("ressourcen guided step is valid without assignment (optional)", () => {
    const draft = validHomeMatchDraft();
    expect(resolveMatchCreateStepValid(draft, "ressourcen")).toBe(true);
    expect(validateMatchCreateWorkflowStep(draft, "ressourcen").valid).toBe(true);
  });

  it("Match opponent selector uses CLUB_ONLY mode", () => {
    const selector = read("components/admin/matchcenter/MatchCreateMatchupSelector.tsx");
    expect(selector).toContain('mode="CLUB_ONLY"');
    expect(selector).not.toContain('mode="CLUB_THEN_TEAM"');
  });

  it("Tournament external participant uses canonical CLUB_ONLY SceClubTeamSelectorDialog (01F)", () => {
    const workflow = read("components/admin/tournamentcenter/TournamentParticipantAddWorkflow.tsx");
    expect(workflow).toContain("SceClubTeamSelectorDialog");
    expect(workflow).toContain('mode="CLUB_ONLY"');
    expect(workflow).toContain('testIdPrefix="tournament-participant-club-selector"');
    expect(workflow).toContain("onAddExternalClub");
    expect(workflow).not.toContain('mode="CLUB_THEN_TEAM"');
    expect(workflow).not.toContain("<ExternalClubPicker");
  });

  it("Tournament participant workflow does not adopt Match HOME/AWAY identity semantics", () => {
    const workflow = read("components/admin/tournamentcenter/TournamentParticipantAddWorkflow.tsx");
    expect(workflow).not.toContain("homeAway");
    expect(workflow).not.toContain("MatchCreateMatchupSelector");
    expect(workflow).not.toContain("match-create-home-away-switch");
  });

  it("HOME left / AWAY right when tenant is away with club-only opponent", () => {
    const sides = buildMatchCreatePreviewSummary({
      tenantClubName: "FC Allschwil",
      tenantLogoUrl: null,
      tenantTeamName: "1. Mannschaft",
      homeAway: "AWAY",
      opponentClubName: "FC Rival",
      opponentTeamName: "",
      opponentExternalClubId: "club-ext-1",
    });
    expect(sides.home.displayName).toContain("Rival");
    expect(sides.away.isOwnTeam).toBe(true);
  });

  it("documents optional resource default in activity creation architecture", () => {
    expect(read("docs/design/SCE-ACTIVITY-CREATION.md")).toContain("Resource assignment default");
    expect(read("docs/design/SCE-ACTIVITY-CREATION.md")).toContain("TOURNAMENT_EXTERNAL_CLUB_SELECTION");
  });
});
