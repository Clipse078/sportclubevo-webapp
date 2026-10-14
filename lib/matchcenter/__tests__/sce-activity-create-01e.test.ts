import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyMatchMaterialChanges } from "@/lib/matchcenter/composer/match-material-change";
import { createEmptyMatchComposerDraft } from "@/lib/matchcenter/composer/match-composer-draft-types";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { validateActivityGovernanceConfiguration } from "@/lib/sce/activity-governance/configuration-validation";
import {
  computeMatchCreateTabErrors,
  firstInvalidMatchCreateTab,
  resolveMatchComposerPersistedLocation,
} from "@/lib/matchcenter/match-create-validation";
import { buildMatchCreateTabNavigationConfig } from "@/lib/matchcenter/match-create-workflow-config";
import { buildMatchCreatePreviewSummary } from "@/lib/matchcenter/composer/build-match-create-preview-pair";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01E — Match adoption", () => {
  it("production /new route adopts SceActivityComposer", () => {
    const page = read("app/(admin)/dashboard/matchcenter/new/page.tsx");
    const form = read("components/admin/matchcenter/MatchCreateForm.tsx");
    expect(form).toContain("SceActivityComposer");
    expect(page).toContain("loadMatchEffectiveGovernanceForSession");
  });

  it("uses canonical match tabs", () => {
    const config = buildMatchCreateTabNavigationConfig();
    const labels = config.tabs.map((tab) => tab.key);
    expect(labels).toEqual(["teams", "termin", "ressourcen", "spielbetrieb", "uebersicht"]);
  });

  it("routes validation to first invalid tab", () => {
    const errors = computeMatchCreateTabErrors(createEmptyMatchComposerDraft());
    expect(firstInvalidMatchCreateTab(errors)).toBe("teams");
  });

  it("preserves away location strings verbatim", () => {
    const payload = createEmptyMatchComposerDraft();
    payload.location = "SV Sissach · Sportzentrum Tannenbrunn, Sissach - 2";
    expect(resolveMatchComposerPersistedLocation(payload)).toBe(
      "SV Sissach · Sportzentrum Tannenbrunn, Sissach - 2",
    );
  });

  it("HOME left AWAY right even when tenant is away", () => {
    const sides = buildMatchCreatePreviewSummary({
      tenantClubName: "FC Allschwil",
      tenantLogoUrl: null,
      tenantTeamName: "Team A",
      homeAway: "AWAY",
      opponentClubName: "FC Rival",
      opponentTeamName: "",
      opponentExternalClubId: null,
    });
    expect(sides.home.displayName).toContain("Rival");
    expect(sides.away.isOwnTeam).toBe(true);
  });

  it("seeds match approve permission key", () => {
    expect(PERMISSIONS.ACTIVITIES_MATCH_APPROVE).toBe("activities.match.approve");
  });

  it("blocks approval-required without validators for match", () => {
    const issues = validateActivityGovernanceConfiguration({
      tenantId: "t1",
      activityTypes: [
        {
          activityType: "MATCH",
          defaultPublicationAuthority: "DIRECT_PUBLISH",
          validatorPersonIds: [],
          creatorPolicies: [{ personId: "p1", publicationAuthority: "APPROVAL_REQUIRED" }],
        },
      ],
    });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("Wochenplaner opens match overlay", () => {
    expect(read("components/admin/planning-hub/PlanningHubCreateMenu.tsx")).toContain(
      "planning-hub-create-match-overlay",
    );
    expect(read("app/(admin)/dashboard/planner/week/page.tsx")).toContain("loadMatchComposerCreateSurfaceProps");
  });

  it("match management uses overlay trigger", () => {
    expect(read("components/admin/matchcenter/MatchComposerCreateTrigger.tsx")).toContain(
      "match-create-overlay-trigger",
    );
    expect(read("app/(admin)/dashboard/matchcenter/page.tsx")).toContain("MatchComposerCreateTrigger");
  });

  it("uses shared resource kind icons in form", () => {
    expect(read("components/admin/matchcenter/MatchCreateForm.tsx")).toContain(
      "PlanningResourceAssignmentKindIcon",
    );
  });

  it("R3 — guided composer, matchup selector, and canonical club-team selector", () => {
    const form = read("components/admin/matchcenter/MatchCreateForm.tsx");
    expect(form).toContain("guidedWorkflow");
    expect(form).toContain("MatchCreateMatchupSelector");
    expect(form).toContain('finalReviewTab: "uebersicht"');
    expect(read("components/admin/matchcenter/MatchCreateMatchupSelector.tsx")).toContain(
      "SceClubTeamSelectorDialog",
    );
    expect(existsSync(join(root, "app/api/clubs/selectable/route.ts"))).toBe(true);
    expect(read("components/sce/activity-composer/SceActivityComposer.tsx")).toContain(
      "SceActivityComposerWorkflowNav",
    );
  });

  it("persists match composer drafts via dedicated API", () => {
    expect(existsSync(join(root, "app/api/match/composer/drafts/route.ts"))).toBe(true);
    expect(
      read("prisma/migrations/20261014120000_sce_activity_create_01e_match/migration.sql"),
    ).toContain("MatchComposerDraft");
  });

  it("material change classifier detects team edits", () => {
    const base = createEmptyMatchComposerDraft();
    const changed = { ...base, teamId: "team-2" };
    expect(classifyMatchMaterialChanges(base, changed)).toContain("ORGANISATIONAL_AUDIENCE");
  });

  it("extends person workspace with match governance section", () => {
    expect(read("components/admin/users/people-access/PersonMatchGovernanceSection.tsx")).toContain(
      "SwitchToggle",
    );
  });
});
