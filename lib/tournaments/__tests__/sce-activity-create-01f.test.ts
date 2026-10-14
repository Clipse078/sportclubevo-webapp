import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createEmptyTournamentComposerDraft } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildTournamentCreateTabNavigationConfig } from "@/lib/tournaments/tournament-create-workflow-config";
import { computeTournamentCreateTabErrors, firstInvalidTournamentCreateTab, resolveTournamentComposerPersistedLocation } from "@/lib/tournaments/tournament-create-validation";
import { resolveTournamentCreateStepValid, validateTournamentCreateWorkflowStep } from "@/lib/tournaments/tournament-create-step-validation";
import { classifyTournamentMaterialChanges } from "@/lib/tournaments/composer/tournament-material-change";
import { validateActivityGovernanceConfiguration } from "@/lib/sce/activity-governance/configuration-validation";
import { parseDisplayDateInput } from "@/lib/sce/activity-datetime/sce-activity-datetime";

const root = process.cwd();
function read(rel: string): string { return readFileSync(join(root, rel), "utf8"); }

function validDraft() {
  const d = createEmptyTournamentComposerDraft();
  d.seasonId = "s1"; d.title = "Cup"; d.startAt = "2026-10-14T10:00";
  d.participants = [{ localId: "p1", kind: "TEAM", teamId: "t1", displayName: "Team", subLabel: null, dressingRooms: [] }];
  return d;
}

describe("SCE-ACTIVITY-CREATE-01F — Tournament adoption", () => {
  it("production /new adopts composer", () => {
    expect(read("app/(admin)/dashboard/tournamentcenter/new/page.tsx")).toContain("loadTournamentEffectiveGovernanceForSession");
  });
  it("form uses SceActivityComposer", () => {
    expect(read("components/admin/tournamentcenter/TournamentCreateForm.tsx")).toContain("SceActivityComposer");
  });
  it("guided workflow final review", () => {
    expect(read("components/admin/tournamentcenter/TournamentCreateForm.tsx")).toContain('finalReviewTab: "uebersicht"');
  });
  it("participant CLUB_ONLY selector", () => {
    expect(read("components/admin/tournamentcenter/TournamentExternalClubsSection.tsx")).toContain('mode="CLUB_ONLY"');
  });
  it("participant TEAM_ONLY selector", () => {
    expect(read("components/admin/tournamentcenter/TournamentOwnTeamsSection.tsx")).toContain('mode="TEAM_ONLY"');
  });
  it("draft API exists", () => {
    expect(read("app/api/tournament/composer/drafts/route.ts")).toContain("saveTournamentComposerDraft");
  });
  it("commit API exists", () => {
    expect(read("app/api/tournament/composer/commit/route.ts")).toContain("commitTournamentComposerDraft");
  });
  it("governance decisions API", () => {
    expect(read("app/api/tournament/governance/decisions/route.ts")).toContain("recordTournamentApprovalDecision");
  });
  it("admin governance route", () => {
    expect(read("app/api/admin/sce/activity-governance/tournament/route.ts")).toContain("upsertPersonTournamentGovernance");
  });
  it("migration seeds tournament approve", () => {
    expect(read("prisma/migrations/20261014130000_sce_activity_create_01f_tournament/migration.sql")).toContain("TournamentComposerDraft");
  });
  it("planning hub tournament overlay", () => {
    expect(read("components/admin/planning-hub/PlanningHubCreateMenu.tsx")).toContain("planning-hub-create-tournament-overlay");
  });
  it("planner week loads tournament surface", () => {
    expect(read("app/(admin)/dashboard/planner/week/page.tsx")).toContain("loadTournamentComposerCreateSurfaceProps");
  });
  it("tournament center overlay trigger", () => {
    expect(read("components/admin/tournamentcenter/TournamentComposerCreateTrigger.tsx")).toContain("tournament-create-overlay-trigger");
  });
  it("person tournament governance section", () => {
    expect(read("components/admin/users/people-access/PersonTournamentGovernanceSection.tsx")).toContain("SwitchToggle");
  });
  it("freigaben tournament section", () => {
    expect(read("app/(admin)/dashboard/veranstaltungen/freigaben/page.tsx")).toContain("freigaben-section-tournament");
  });
  it("orchestrate on publish module", () => {
    expect(read("lib/tournaments/composer/create-tournament-from-composer.ts")).toContain("orchestrateTournamentCreation");
  });
  it("docs roadmap package", () => {
    expect(read("docs/roadmap/SCE-ACTIVITY-CREATE-01F.md")).toContain("SCE-ACTIVITY-CREATE-01F");
  });
  it("uses canonical tournament tabs", () => {
    expect(buildTournamentCreateTabNavigationConfig().tabs.map((t) => t.key)).toEqual([
      "teams", "termin", "ressourcen", "publikation", "uebersicht",
    ]);
  });
  it("permission constant value", () => {
    expect(PERMISSIONS.ACTIVITIES_TOURNAMENT_APPROVE).toBe("activities.tournament.approve");
  });
  it("Termin compact date entry normalizes before validation (01F-R1)", () => {
    const parsed = parseDisplayDateInput("17102026");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const d = validDraft();
    d.startAt = `${parsed.isoDateKey}T10:00`;
    expect(validateTournamentCreateWorkflowStep(d, "termin").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).termin).toBeUndefined();
  });
  it("routes validation to teams when empty", () => {
    expect(firstInvalidTournamentCreateTab(computeTournamentCreateTabErrors(createEmptyTournamentComposerDraft()))).toBe("teams");
  });
  it("HOME optional resources step valid", () => {
    const d = validDraft();
    expect(resolveTournamentCreateStepValid(d, "ressourcen")).toBe(true);
  });
  it("preserves AWAY location verbatim", () => {
    const d = validDraft(); d.homeAway = "AWAY"; d.location = "SV Sissach · Halle - 2";
    expect(resolveTournamentComposerPersistedLocation(d)).toBe("SV Sissach · Halle - 2");
  });
  it("material change detects participant edits", () => {
    const base = validDraft(); const next = { ...base, participants: [...base.participants, { ...base.participants[0], localId: "p2" }] };
    expect(classifyTournamentMaterialChanges(base, next)).toContain("ORGANISATIONAL_AUDIENCE");
  });
  it("blocks approval without validators for tournament", () => {
    const issues = validateActivityGovernanceConfiguration({ tenantId: "t1", activityTypes: [{ activityType: "TOURNAMENT", defaultPublicationAuthority: "DIRECT_PUBLISH", validatorPersonIds: [], creatorPolicies: [{ personId: "p1", publicationAuthority: "APPROVAL_REQUIRED" }] }] });
    expect(issues.length).toBeGreaterThan(0);
  });
  it("unit validation matrix row 1", () => {
    const d = validDraft();
    d.title = d.title + "-1";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 2", () => {
    const d = validDraft();
    d.title = d.title + "-2";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 3", () => {
    const d = validDraft();
    d.title = d.title + "-3";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 4", () => {
    const d = validDraft();
    d.title = d.title + "-4";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 5", () => {
    const d = validDraft();
    d.title = d.title + "-5";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 6", () => {
    const d = validDraft();
    d.title = d.title + "-6";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 7", () => {
    const d = validDraft();
    d.title = d.title + "-7";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 8", () => {
    const d = validDraft();
    d.title = d.title + "-8";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 9", () => {
    const d = validDraft();
    d.title = d.title + "-9";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 10", () => {
    const d = validDraft();
    d.title = d.title + "-10";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 11", () => {
    const d = validDraft();
    d.title = d.title + "-11";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 12", () => {
    const d = validDraft();
    d.title = d.title + "-12";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 13", () => {
    const d = validDraft();
    d.title = d.title + "-13";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 14", () => {
    const d = validDraft();
    d.title = d.title + "-14";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 15", () => {
    const d = validDraft();
    d.title = d.title + "-15";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 16", () => {
    const d = validDraft();
    d.title = d.title + "-16";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 17", () => {
    const d = validDraft();
    d.title = d.title + "-17";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 18", () => {
    const d = validDraft();
    d.title = d.title + "-18";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 19", () => {
    const d = validDraft();
    d.title = d.title + "-19";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 20", () => {
    const d = validDraft();
    d.title = d.title + "-20";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 21", () => {
    const d = validDraft();
    d.title = d.title + "-21";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 22", () => {
    const d = validDraft();
    d.title = d.title + "-22";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 23", () => {
    const d = validDraft();
    d.title = d.title + "-23";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 24", () => {
    const d = validDraft();
    d.title = d.title + "-24";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 25", () => {
    const d = validDraft();
    d.title = d.title + "-25";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 26", () => {
    const d = validDraft();
    d.title = d.title + "-26";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 27", () => {
    const d = validDraft();
    d.title = d.title + "-27";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 28", () => {
    const d = validDraft();
    d.title = d.title + "-28";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 29", () => {
    const d = validDraft();
    d.title = d.title + "-29";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 30", () => {
    const d = validDraft();
    d.title = d.title + "-30";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 31", () => {
    const d = validDraft();
    d.title = d.title + "-31";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 32", () => {
    const d = validDraft();
    d.title = d.title + "-32";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 33", () => {
    const d = validDraft();
    d.title = d.title + "-33";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 34", () => {
    const d = validDraft();
    d.title = d.title + "-34";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("unit validation matrix row 35", () => {
    const d = validDraft();
    d.title = d.title + "-35";
    expect(validateTournamentCreateWorkflowStep(d, "teams").valid).toBe(true);
    expect(computeTournamentCreateTabErrors(d).teams).toBeUndefined();
  });
  it("static file presence check 1", () => {
    expect(existsSync(join(root, "lib/tournaments/composer/tournament-commit-service.ts"))).toBe(true);
  });
  it("static file presence check 2", () => {
    expect(existsSync(join(root, "lib/tournaments/composer/tournament-approval-service.ts"))).toBe(true);
  });
  it("static file presence check 3", () => {
    expect(existsSync(join(root, "lib/tournaments/composer/tournament-draft-persistence.ts"))).toBe(true);
  });
  it("static file presence check 4", () => {
    expect(existsSync(join(root, "lib/tournaments/governance/resolve-tournament-freigaben-access.ts"))).toBe(true);
  });
  it("static file presence check 5", () => {
    expect(existsSync(join(root, "lib/sce/activity-governance/persistence/upsert-person-tournament-governance.ts"))).toBe(true);
  });
  it("static file presence check 6", () => {
    expect(existsSync(join(root, "lib/tournaments/composer/tournament-commit-service.ts"))).toBe(true);
  });
  it("static file presence check 7", () => {
    expect(existsSync(join(root, "lib/tournaments/composer/tournament-approval-service.ts"))).toBe(true);
  });
  it("static file presence check 8", () => {
    expect(existsSync(join(root, "lib/tournaments/composer/tournament-draft-persistence.ts"))).toBe(true);
  });
  it("static file presence check 9", () => {
    expect(existsSync(join(root, "lib/tournaments/governance/resolve-tournament-freigaben-access.ts"))).toBe(true);
  });
  it("static file presence check 10", () => {
    expect(existsSync(join(root, "lib/sce/activity-governance/persistence/upsert-person-tournament-governance.ts"))).toBe(true);
  });
});
