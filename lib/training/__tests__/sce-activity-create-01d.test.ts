import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyTrainingMaterialChanges } from "@/lib/training/composer/training-material-change";
import { createEmptyTrainingComposerDraft } from "@/lib/training/composer/training-composer-draft-types";
import { trainingSeriesPublishedVisibilityWhere } from "@/lib/training/training-published-visibility";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { validateActivityGovernanceConfiguration } from "@/lib/sce/activity-governance/configuration-validation";
import {
  computeTrainingCreateTabErrors,
  firstInvalidTrainingCreateTab,
} from "@/lib/training/training-create-validation";
import { buildTrainingCreateTabNavigationConfig } from "@/lib/training/training-create-workflow-config";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01D — Training adoption", () => {
  it("production /new route adopts SceActivityComposer", () => {
    const page = read("app/(admin)/dashboard/training/new/page.tsx");
    const form = read("components/admin/training/TrainingCreateForm.tsx");
    expect(form).toContain("SceActivityComposer");
    expect(page).toContain("loadTrainingEffectiveGovernanceForSession");
  });

  it("uses canonical training tabs", () => {
    const config = buildTrainingCreateTabNavigationConfig();
    const labels = config.tabs.map((tab) => tab.key);
    expect(labels).toEqual(["team", "termin", "wiederholung", "ressourcen", "pruefen"]);
  });

  it("routes validation to first invalid tab", () => {
    const errors = computeTrainingCreateTabErrors(createEmptyTrainingComposerDraft());
    expect(firstInvalidTrainingCreateTab(errors)).toBe("team");
  });

  it("R1 — guided composer enabled on training form", () => {
    expect(read("components/admin/training/TrainingCreateForm.tsx")).toContain("guidedWorkflow");
  });

  it("seeds training approve permission key", () => {
    expect(PERMISSIONS.ACTIVITIES_TRAINING_APPROVE).toBe("activities.training.approve");
  });

  it("published visibility excludes non-approved planning stages", () => {
    expect(trainingSeriesPublishedVisibilityWhere().planningStage).toEqual({
      in: ["APPROVED"],
    });
  });

  it("material change classifier detects team edits", () => {
    const base = createEmptyTrainingComposerDraft();
    const changed = { ...base, teamSeasonId: "ts-2" };
    expect(classifyTrainingMaterialChanges(base, changed)).toContain("ORGANISATIONAL_AUDIENCE");
  });

  it("blocks approval-required without validators for training", () => {
    const issues = validateActivityGovernanceConfiguration({
      tenantId: "t1",
      activityTypes: [
        {
          activityType: "TRAINING",
          defaultPublicationAuthority: "DIRECT_PUBLISH",
          validatorPersonIds: [],
          creatorPolicies: [
            { personId: "p1", publicationAuthority: "APPROVAL_REQUIRED" },
          ],
        },
      ],
    });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("provides contextual overlay create on training management", () => {
    expect(read("components/sce/activity-create/SceActivityCreateMenu.tsx")).toContain(
      "sce-activity-create",
    );
    expect(read("app/(admin)/dashboard/training/page.tsx")).toContain("SceActivityCreateMenu");
  });

  it("extends person workspace with training governance section", () => {
    expect(read("components/admin/users/people-access/PersonTrainingGovernanceSection.tsx")).toContain(
      "SwitchToggle",
    );
    expect(read("components/admin/users/people-access/PersonActivityGovernanceTabContent.tsx")).toContain(
      "PersonClubEventGovernanceSection",
    );
  });

  it("does not introduce generic Activity entity", () => {
    expect(existsSync(join(root, "app/api/activity/route.ts"))).toBe(false);
  });

  it("surfaces draft discovery on training management", () => {
    expect(read("components/admin/training/TrainingComposerDraftList.tsx")).toContain(
      "training-composer-draft-list",
    );
    expect(read("app/(admin)/dashboard/training/page.tsx")).toContain(
      "listTrainingComposerDraftsForManagementView",
    );
  });

  it("persists training composer drafts via dedicated API", () => {
    expect(existsSync(join(root, "app/api/training/composer/drafts/route.ts"))).toBe(true);
    expect(read("prisma/migrations/20261013180000_sce_activity_create_01d_training/migration.sql")).toContain(
      "TrainingComposerDraft",
    );
  });
});
