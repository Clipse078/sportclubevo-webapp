/**
 * PR #1017 — smallest separate application compatibility release (migrations already on shared STAGE).
 * PO approval artifact; does not trigger deploys or STAGE writes.
 */

export const SCE_CD_CONNECTED_COMPATIBILITY_RELEASE = {
  pullRequest: 1017 as const,
  /** Schema migrations are already recorded on shared STAGE — this release is application-only. */
  schemaMigrationsAlreadyOnSharedStage: [
    "20261120120000_sce_cd_connected_workspace",
    "20261120140000_sce_cd_connected_strategy_org_units",
  ] as const,
  rolloutOrder: [
    "1. Keep PR #1017 open; merge only after PO signs off STAGE PR-preview UAT.",
    "2. Deploy PR #1017 application to sportclubevo-webapp-stage with APPLY_DATABASE_MIGRATIONS unset (migrations already applied).",
    "3. Run read-only STAGE inventories: cd-connected:stage-migration-verify and cd-connected:stage-reconciliation-outcome.",
    "4. PO manual UAT on the STAGE-backed PR preview URL (readyPreviewOrigin in PO handoff ledger).",
    "5. Optional Acceptance seed stays on sce_acceptance only — never on shared STAGE.",
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