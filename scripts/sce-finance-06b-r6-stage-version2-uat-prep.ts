/**
 * SCE-FIN-06B-R6 — designated STAGE Version 2 PO UAT preparation (inspect-only).
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-finance-06b-r6-stage-version2-uat-prep.ts
 */

import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { CLUB_ADMIN_EMAIL } from "@/lib/finance/uat/sce-finance-04b-uat-projection-data";
import {
  evaluateStageIdentity,
  financeAuthContextForR5,
  loadVersion1PublicationSummary,
  resolveFcaTenant,
  resolveFy2026,
  snapshotPayloadDigest,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import {
  metricsFromLivePnl,
  metricsFromStoredSnapshot,
  metricsMatchPoWholeChfPresentation,
  R6_LIVE_BEFORE_VERSION_2,
  R6_PO_UAT_STEPS,
  R6_VERSION_1_FROZEN,
} from "@/lib/finance/uat/sce-finance-06b-r6-version2-uat-prep";
import { loadFinanceManagementPnlReadModel } from "@/lib/finance/services/finance-management-reporting-query-service";
import { loadFinancePublicationVersionSnapshot } from "@/lib/finance/services/finance-publication-service";

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
  const stage = evaluateStageIdentity();
  printSection("STAGE_ENVIRONMENT_IDENTITY", stage);
  if (!stage.stageIdentityVerified) {
    throw new Error("STAGE identity not verified — aborting R6 prep.");
  }

  const tenant = await resolveFcaTenant(prisma);
  const financeYear = await resolveFy2026(prisma, tenant.id);
  const userId = await resolveClubAdminUserId();
  const ctx = financeAuthContextForR5({ tenantId: tenant.id, userId });

  const versionSummary = await loadVersion1PublicationSummary(prisma, tenant.id, financeYear.id);
  printSection("PUBLICATION_HISTORY", {
    EXISTING_VERSIONS: versionSummary.versionNumbers,
    VERSION_1_EXISTS: versionSummary.exists,
    VERSION_2_EXISTS: versionSummary.version2Exists,
    NEXT_EXPECTED_VERSION: versionSummary.version2Exists ? null : 2,
  });

  if (!versionSummary.exists || !versionSummary.publicationId) {
    throw new Error("Version 1 missing — cannot prepare Version 2 PO UAT.");
  }

  const live = await loadFinanceManagementPnlReadModel(prisma, ctx, {
    financeYearId: financeYear.id,
  });
  if (live.availability !== "AVAILABLE") {
    throw new Error(`Live Management P&L unavailable: ${live.availability}`);
  }
  const liveMetrics = metricsFromLivePnl(live);
  const currencyCode = live.baseCurrency;
  if (!currencyCode) {
    throw new Error("Live Management P&L missing base currency.");
  }

  const liveMatchesCheckpoint = metricsMatchPoWholeChfPresentation(
    liveMetrics,
    R6_LIVE_BEFORE_VERSION_2,
    currencyCode,
  );

  printSection("LIVE_STATE_BEFORE_VERSION_2", {
    CURRENCY: currencyCode,
    METRICS_MINOR_UNITS: liveMetrics,
    PO_WHOLE_CHF_CHECKPOINT: R6_LIVE_BEFORE_VERSION_2,
    MATCHES_EXPECTED_R5_POST_MUTATION: liveMatchesCheckpoint,
  });

  if (!liveMatchesCheckpoint) {
    throw new Error(
      "STOP: Live finance does not match expected R5 post-mutation checkpoint. Do not manufacture values.",
    );
  }

  const v1Read = await loadFinancePublicationVersionSnapshot(prisma, ctx, {
    publicationId: versionSummary.publicationId,
    versionNumber: 1,
  });
  if (!v1Read.ok) {
    throw new Error("Failed to load Version 1 via publication snapshot read path.");
  }

  const v1Metrics = metricsFromStoredSnapshot(v1Read.snapshot);
  const v1MatchesFrozen = metricsMatchPoWholeChfPresentation(
    v1Metrics,
    R6_VERSION_1_FROZEN,
    v1Read.snapshot.currencyCode,
  );

  printSection("VERSION_1_IMMUTABILITY", {
    SNAPSHOT_SCHEMA: v1Read.snapshot.schemaVersion,
    SNAPSHOT_DIGEST: snapshotPayloadDigest(v1Read.snapshot),
    METRICS_MINOR_UNITS: v1Metrics,
    PO_WHOLE_CHF_BASELINE: R6_VERSION_1_FROZEN,
    MATCHES_PO_V1_BASELINE: v1MatchesFrozen,
    LIVE_DIFFERS_FROM_V1:
      metricsMatchPoWholeChfPresentation(liveMetrics, v1Metrics, currencyCode) === false,
    READ_PATH: "FinancePublicationVersion → snapshotPayloadJson → presentation read model",
    LIVE_FIN05_REBUILD_FOR_HISTORY: false,
  });

  if (!v1MatchesFrozen) {
    throw new Error("STOP: Version 1 no longer matches PO immutability baseline.");
  }

  if (versionSummary.version2Exists) {
    printSection("VERSION_2_PO_UAT", {
      STATUS: "VERSION_2_ALREADY_EXISTS",
      NOTE: "Engineering prep assumes PO has not yet created V2. Re-run after PO creates V2 for post-UAT inspection.",
    });
  } else {
    printSection("VERSION_2_PO_UAT", {
      STATUS: "READY_FOR_PO_UI_PUBLISH",
      INSTRUCTION_DOC: "docs/finance/SCE-FINANCE-06B-R6-PO-VERSION-2-UAT.md",
      STEPS: R6_PO_UAT_STEPS,
      DO_NOT: [
        "Create Version 2 via scripts or direct DB inserts",
        "Restore Current Forecast yet",
        "Merge PR #917 before PO Version 2 checkpoint",
      ],
    });
  }

  printSection("FIN-06B-R5_PO_IMMUTABILITY_CHECKPOINT", {
    PO_VISUAL_UAT: "PASS",
    RECORDED_BY: "R6 engineering handoff (PO sign-off on Version 1 after live mutation)",
  });

  printSection("RESULT", {
    LIVE_STATE: liveMatchesCheckpoint ? "PASS" : "FAIL",
    VERSION_1_IMMUTABILITY: v1MatchesFrozen ? "PASS" : "FAIL",
    VERSION_2_UAT_PREP: versionSummary.version2Exists ? "V2_EXISTS" : "PREPARED",
    PRODUCTION_TOUCHED: "NO",
  });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
