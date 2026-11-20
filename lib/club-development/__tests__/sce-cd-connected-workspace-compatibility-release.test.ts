import { describe, expect, it } from "vitest";
import { SCE_CD_CONNECTED_COMPATIBILITY_RELEASE } from "../sce-cd-connected-workspace-compatibility-release";
import { CONNECTED_WORKSPACE_PO_UAT_HANDOFF } from "../sce-cd-connected-workspace-po-uat-handoff";

describe("PR #1017 compatibility release handoff", () => {
  it("lists migrations already on shared STAGE", () => {
    expect(SCE_CD_CONNECTED_COMPATIBILITY_RELEASE.schemaMigrationsAlreadyOnSharedStage).toContain(
      CONNECTED_WORKSPACE_PO_UAT_HANDOFF.requiredMigration,
    );
    expect(SCE_CD_CONNECTED_COMPATIBILITY_RELEASE.schemaMigrationsAlreadyOnSharedStage).toContain(
      CONNECTED_WORKSPACE_PO_UAT_HANDOFF.orgUnitAssignmentMigration,
    );
  });

  it("orders rollout with PR preview UAT before merge", () => {
    expect(SCE_CD_CONNECTED_COMPATIBILITY_RELEASE.rolloutOrder[0]).toMatch(/Keep PR #1017 open/);
    expect(SCE_CD_CONNECTED_COMPATIBILITY_RELEASE.rolloutOrder.join(" ")).toMatch(
      /APPLY_DATABASE_MIGRATIONS unset/,
    );
  });

  it("scopes TARGET reads and canonical strategy selection", () => {
    const scope = SCE_CD_CONNECTED_COMPATIBILITY_RELEASE.applicationScope;
    expect(scope.targetTaskListDetailReads.some((s) => s.includes("TARGET"))).toBe(true);
    expect(scope.canonicalClubStrategySelection.some((s) => s.includes("club-strategy-service"))).toBe(
      true,
    );
  });
});