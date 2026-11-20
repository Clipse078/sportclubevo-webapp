/**
 * PR #1017 — smallest separate application compatibility release (migrations already on shared STAGE).
 * PO approval artifact; does not trigger deploys or STAGE writes.
 */

export const SCE_CD_CONNECTED_COMPATIBILITY_RELEASE = {
  pullRequest: 1017 as const,
  /**
   * Application delivery vehicle for canonical STAGE (distinct from PO UX/UAT branch state until merge).
   * After PO signs off: merge PR #1017 → STAGE; the resulting STAGE commit is the minimal compatibility release.
   */
  deliveryBranch: "cursor/vereinsentwicklung-connected-workspace-509e" as const,
  deliveryBaseBranch: "STAGE" as const,
  /** Set after merge to STAGE; until then rollout uses the PR head commit on the STAGE preview alias. */
  canonicalStageReleaseCommit: null as string | null,
  /** Schema migrations are already recorded on shared STAGE — this release is application-only. */
  schemaMigrationsAlreadyOnSharedStage: [
    "20261120120000_sce_cd_connected_workspace",
    "20261120140000_sce_cd_connected_strategy_org_units",
  ] as const,
  rolloutOrder: [
    "1. Keep PR #1017 (feature + compatibility code) open until PO finishes STAGE PR-preview UAT.",
    "2. PO approval gate: merge PR #1017 → STAGE (no squash that drops migration-adjacent application files).",
    "3. Deploy STAGE project sportclubevo-webapp-stage from the merge commit with APPLY_DATABASE_MIGRATIONS unset.",
    "4. Run read-only STAGE inventories: npm run cd-connected:stage-migration-verify and npm run cd-connected:stage-reconciliation-outcome.",
    "5. Smoke TARGET task list/detail + club-wide strategy pick on STAGE preview (read-only); PO Acceptance seed remains on sce_acceptance only.",
  ] as const,
  poApprovalVerification: [
    "TEST_DATABASE_URL=… npm run cd-connected:disposable-migration-verify",
    "TEST_DATABASE_URL=… npx vitest run lib/club-development/__tests__/sce-cd-connected-workflow.integration.test.ts",
    "npm run cd-connected:stage-migration-verify (read-only shared STAGE)",
  ] as const,
  applicationScope: {
    targetTaskListDetailReads: [
      "lib/tasks/task-context-registry.ts — TARGET registry entry",
      "lib/club-development/vorhaben-workspace.ts — TARGET_CONTEXT classification and filters",
      "lib/club-development/vereinsentwicklung-task-context-labels.ts — TARGET bundles",
      "lib/club-development/vereinsentwicklung-connected-task-table*.ts — connected task surfaces",
    ],
    canonicalClubStrategySelection: [
      "lib/club-development/club-strategy-service.ts — oldest CLUB-wide row when multiple exist",
      "lib/club-development/club-strategy-service.ts — listClubStrategies org-unit filter + junction reads",
    ],
  } as const,
  verification: {
    disposableMigrationReplay: "npm run cd-connected:disposable-migration-verify",
    disposableWorkflowIntegration:
      "TEST_DATABASE_URL=… npx vitest run lib/club-development/__tests__/sce-cd-connected-workflow.integration.test.ts",
    readonlyStageHealth: "npm run cd-connected:stage-migration-verify",
    poUatSurface: "STAGE PR preview only (not Acceptance) until PO completes screenshot checklist",
  } as const,
  explicitlyOutOfScope: [
    "shared STAGE data repair or ClubStrategy seeding",
    "Acceptance deployment for PO UAT",
    "prisma migrate deploy against STAGE from disposable verification commands",
  ] as const,
} as const;