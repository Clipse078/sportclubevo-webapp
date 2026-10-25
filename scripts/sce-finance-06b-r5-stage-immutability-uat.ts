/**
 * SCE-FIN-06B-R5 — designated STAGE Version 1 immutability checkpoint preparation.
 *
 * Inspect (default):
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-finance-06b-r5-stage-immutability-uat.ts
 *
 * Apply controlled forecast mutation (guarded):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     SCE_OPERATION_AUTHORIZATION=sce-finance-06b-r5-immutability-uat:stage \
 *     ./node_modules/.bin/tsx scripts/sce-finance-06b-r5-stage-immutability-uat.ts \
 *     --apply --confirm SCE-FIN-06B-R5-IMMUTABILITY-APPLY
 */

import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { CLUB_ADMIN_EMAIL } from "@/lib/finance/uat/sce-finance-04b-uat-projection-data";
import {
  assertR5ApplyAuthorization,
  evaluateStageIdentity,
  financeAuthContextForR5,
  loadVersion1PublicationSummary,
  deriveLiveCheckpointAfterMitgliedDelta,
  metricsEqual,
  metricsFromLivePnl,
  metricsFromStoredSnapshot,
  R5_FORECAST_DELTA_MINOR,
  R5_V1_BASELINE,
  readMitgliedsForecastLineMinor,
  resolveFcaTenant,
  resolveFy2026,
  snapshotPayloadDigest,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import { loadFinanceManagementPnlReadModel } from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  assertFinancePublicationVersionNotMutated,
  loadFinancePublicationVersionSnapshot,
} from "@/lib/finance/services/finance-publication-service";
import { upsertForecastLine } from "@/lib/finance/services/finance-forecast-service";

function parseConfirm(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--confirm") return argv[i + 1] ?? null;
    if (arg.startsWith("--confirm=")) return arg.split("=")[1] ?? null;
  }
  return null;
}

function hasApplyFlag(argv: string[]): boolean {
  return argv.includes("--apply");
}

function printSection(label: string, value: unknown): void {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(value, null, 2));
}

async function resolveClubAdminUserId(): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { email: CLUB_ADMIN_EMAIL },
    select: { id: true },
  });
  if (!user) {
    throw new Error(`Club admin user ${CLUB_ADMIN_EMAIL} not found.`);
  }
  return user.id;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = hasApplyFlag(argv);
  const confirm = parseConfirm(argv);

  const stage = evaluateStageIdentity();
  printSection("STAGE_ENVIRONMENT_IDENTITY", stage);

  const tenant = await resolveFcaTenant(prisma);
  const financeYear = await resolveFy2026(prisma, tenant.id);
  const userId = await resolveClubAdminUserId();
  const ctx = financeAuthContextForR5({ tenantId: tenant.id, userId });

  const versionSummary = await loadVersion1PublicationSummary(
    prisma,
    tenant.id,
    financeYear.id,
  );
  printSection("VERSION_1_BEFORE_MUTATION", {
    EXISTS: versionSummary.exists,
    VERSION: versionSummary.versionNumber,
    FY: versionSummary.financeYearName,
    TENANT: versionSummary.tenantName,
    SNAPSHOT_SCHEMA: versionSummary.snapshotSchema,
    PUBLISHED_AT: versionSummary.publishedAt,
    LIFECYCLE: versionSummary.lifecycleStatus,
  });

  if (!versionSummary.exists || !versionSummary.publicationId) {
    throw new Error("Version 1 publication missing — cannot proceed with R5.");
  }

  if (versionSummary.version2Exists) {
    throw new Error(
      `Version 2 already exists (history: ${versionSummary.versionNumbers.join(", ")}). STOP.`,
    );
  }

  const v1Read = await loadFinancePublicationVersionSnapshot(prisma, ctx, {
    publicationId: versionSummary.publicationId,
    versionNumber: 1,
  });
  if (!v1Read.ok) {
    throw new Error("Failed to load Version 1 through canonical publication read path.");
  }

  const v1Metrics = metricsFromStoredSnapshot(v1Read.snapshot);
  const v1DigestBefore = snapshotPayloadDigest(v1Read.snapshot);

  printSection("VERSION_1_BEFORE_MUTATION", {
    ...{
      EXISTS: true,
      VERSION: 1,
      FY: financeYear.name,
      SNAPSHOT_SCHEMA: v1Read.snapshot.schemaVersion,
      EXPECTED_RESULT: v1Metrics.forecastResultMinor,
      BUDGET_RESULT: v1Metrics.budgetResultMinor,
      ACTUAL_RESULT: v1Metrics.actualResultMinor,
      VARIANCE: v1Metrics.forecastVsBudgetDeltaMinor,
      MITGLIEDSBEITRAEGE_FORECAST: v1Metrics.mitgliedsbeitraegeForecastMinor,
      IMMUTABLE_SOURCE: "snapshotPayloadJson",
      LIVE_FIN05_REBUILD_REQUIRED: false,
      SNAPSHOT_DIGEST: v1DigestBefore,
    },
  });

  const forecastLine = await readMitgliedsForecastLineMinor(prisma, tenant.id, financeYear.id);

  const liveBefore = await loadFinanceManagementPnlReadModel(prisma, ctx, {
    financeYearId: financeYear.id,
  });
  if (liveBefore.availability !== "AVAILABLE") {
    throw new Error(`Live Management P&L unavailable: ${liveBefore.availability}`);
  }
  const liveMetricsBefore = metricsFromLivePnl(liveBefore);

  const liveMatchesVersion1Before =
    metricsEqual(liveMetricsBefore, v1Metrics) ||
    JSON.stringify(liveMetricsBefore) === JSON.stringify(v1Metrics);

  const expectedLiveAfter = deriveLiveCheckpointAfterMitgliedDelta(liveMetricsBefore);

  printSection("CONTROLLED_MUTATION_PREFLIGHT", {
    mitgliedsForecastLineMinor: forecastLine.amountMinor,
    poRoundedBaselineMinor: R5_V1_BASELINE.mitgliedsbeitraegeForecastMinor,
    liveMatchesVersion1Snapshot: liveMatchesVersion1Before,
    expectedAfterMutationMinor:
      forecastLine.amountMinor === null
        ? null
        : forecastLine.amountMinor + R5_FORECAST_DELTA_MINOR,
  });

  if (apply) {
    assertR5ApplyAuthorization(process.env, { confirm });

    if (!liveMatchesVersion1Before) {
      throw new Error(
        "Refusing mutation: live Management P&L no longer matches Version 1 snapshot (source drift).",
      );
    }

    const targetMitgliedMinor =
      forecastLine.amountMinor === null
        ? null
        : forecastLine.amountMinor + R5_FORECAST_DELTA_MINOR;

    if (targetMitgliedMinor !== null && forecastLine.amountMinor === targetMitgliedMinor) {
      printSection("CONTROLLED_STAGE_MUTATION", {
        SKIPPED: true,
        REASON: "Live forecast already reflects post-mutation checkpoint.",
      });
    } else if (forecastLine.amountMinor === null || targetMitgliedMinor === null) {
      throw new Error("Mitgliedsbeiträge forecast line missing — cannot apply mutation.");
    } else {
      await upsertForecastLine(prisma, ctx, {
        forecastVersionId: forecastLine.forecastVersionId,
        financialAccountId: forecastLine.accountId,
        amountMinor: targetMitgliedMinor,
      });
      printSection("CONTROLLED_STAGE_MUTATION", {
        ENVIRONMENT: "STAGE",
        TENANT: tenant.name,
        SOURCE: "CURRENT_FORECAST",
        TARGET: "Mitgliedsbeiträge",
        OLD_VALUE: forecastLine.amountMinor,
        NEW_VALUE: targetMitgliedMinor,
        DELTA_MINOR: R5_FORECAST_DELTA_MINOR,
        WRITE_PATH: "upsertForecastLine (finance-forecast-service)",
        PRODUCTION_TOUCHED: false,
      });
    }
  } else {
    printSection("CONTROLLED_STAGE_MUTATION", {
      MODE: "inspect-only",
      APPLY_HINT:
        "Pass --apply --confirm SCE-FIN-06B-R5-IMMUTABILITY-APPLY with SCE_OPERATION_AUTHORIZATION to mutate.",
    });
  }

  const liveAfter = await loadFinanceManagementPnlReadModel(prisma, ctx, {
    financeYearId: financeYear.id,
  });
  if (liveAfter.availability !== "AVAILABLE") {
    throw new Error(`Live Management P&L unavailable after step: ${liveAfter.availability}`);
  }
  const liveMetrics = metricsFromLivePnl(liveAfter);

  printSection("LIVE_FINANCE_AFTER_MUTATION", {
    MITGLIEDSBEITRAEGE_FORECAST: liveMetrics.mitgliedsbeitraegeForecastMinor,
    TOTAL_FORECAST_INCOME: liveMetrics.totalForecastIncomeMinor,
    TOTAL_FORECAST_EXPENSE: liveMetrics.totalForecastExpenseMinor,
    FORECAST_RESULT: liveMetrics.forecastResultMinor,
    BUDGET_RESULT: liveMetrics.budgetResultMinor,
    ACTUAL_RESULT: liveMetrics.actualResultMinor,
    FORECAST_VS_BUDGET: liveMetrics.forecastVsBudgetDeltaMinor,
  });

  const v1ReadAfter = await loadFinancePublicationVersionSnapshot(prisma, ctx, {
    publicationId: versionSummary.publicationId,
    versionNumber: 1,
  });
  if (!v1ReadAfter.ok) {
    throw new Error("Failed to reload Version 1 after mutation.");
  }
  const v1MetricsAfter = metricsFromStoredSnapshot(v1ReadAfter.snapshot);
  const v1DigestAfter = snapshotPayloadDigest(v1ReadAfter.snapshot);

  if (versionSummary.versionId) {
    await assertFinancePublicationVersionNotMutated(
      prisma,
      versionSummary.versionId,
      v1Read.snapshot,
    );
  }

  printSection("VERSION_1_AFTER_MUTATION", {
    MITGLIEDSBEITRAEGE_FORECAST: v1MetricsAfter.mitgliedsbeitraegeForecastMinor,
    TOTAL_FORECAST_INCOME: v1MetricsAfter.totalForecastIncomeMinor,
    TOTAL_FORECAST_EXPENSE: v1MetricsAfter.totalForecastExpenseMinor,
    FORECAST_RESULT: v1MetricsAfter.forecastResultMinor,
    BUDGET_RESULT: v1MetricsAfter.budgetResultMinor,
    ACTUAL_RESULT: v1MetricsAfter.actualResultMinor,
    FORECAST_VS_BUDGET: v1MetricsAfter.forecastVsBudgetDeltaMinor,
  });

  const immutabilityOk =
    v1DigestBefore === v1DigestAfter &&
    JSON.stringify(v1Metrics) === JSON.stringify(v1MetricsAfter);

  const liveAtPostMutationCheckpoint = metricsEqual(liveMetrics, expectedLiveAfter);

  printSection("IMMUTABILITY_PROOF", {
    VERSION_1_BEFORE_EQUALS_AFTER: v1DigestBefore === v1DigestAfter,
    LIVE_DIFFERS_FROM_VERSION_1:
      liveMetrics.forecastResultMinor !== v1MetricsAfter.forecastResultMinor,
    LIVE_FIN05_REBUILD_USED_FOR_HISTORY: false,
    V1_MATCHES_PO_ROUNDED_BASELINE: metricsEqual(v1MetricsAfter, R5_V1_BASELINE),
    V1_SNAPSHOT_STABLE: immutabilityOk,
    LIVE_AT_EXPECTED_CHECKPOINT: apply ? liveAtPostMutationCheckpoint : liveMatchesVersion1Before,
    RESULT:
      immutabilityOk &&
      liveMetrics.forecastResultMinor !== v1MetricsAfter.forecastResultMinor
        ? apply
          ? liveAtPostMutationCheckpoint
            ? "PASS"
            : "FAIL"
          : "IMMUTABILITY_CHECKPOINT_READY"
        : apply
          ? "FAIL"
          : liveMatchesVersion1Before
            ? "PENDING_APPLY"
            : "FAIL",
  });

  printSection("PUBLICATION_HISTORY", {
    EXISTING_VERSIONS: versionSummary.versionNumbers,
    VERSION_2_EXISTS: versionSummary.version2Exists,
    NEXT_EXPECTED_VERSION: 2,
  });

  if (apply && !liveAtPostMutationCheckpoint) {
    throw new Error("Post-mutation live finance does not match R5 expected checkpoint.");
  }
  if (apply && !immutabilityOk) {
    throw new Error("Version 1 immutability proof failed after mutation.");
  }

  void liveMetricsBefore;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
