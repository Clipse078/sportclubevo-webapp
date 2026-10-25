/**
 * SCE-FIN-06B-R7 — designated STAGE publication history closure verification (inspect-only).
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-finance-06b-r7-stage-publication-closure-verify.ts
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
  R5_LIVE_AFTER_MUTATION,
  R5_V1_BASELINE,
  snapshotPayloadDigest,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import {
  metricsFromLivePnl,
  metricsFromStoredSnapshot,
  metricsMatchPoWholeChfPresentation,
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
    throw new Error("STAGE identity not verified — aborting R7 closure verify.");
  }

  const tenant = await resolveFcaTenant(prisma);
  const financeYear = await resolveFy2026(prisma, tenant.id);
  const userId = await resolveClubAdminUserId();
  const ctx = financeAuthContextForR5({ tenantId: tenant.id, userId });

  const versionSummary = await loadVersion1PublicationSummary(prisma, tenant.id, financeYear.id);

  const publication = versionSummary.publicationId
    ? await prisma.financePublication.findFirst({
        where: { id: versionSummary.publicationId, tenantId: tenant.id },
        include: { versions: { orderBy: { versionNumber: "asc" } } },
      })
    : null;

  const versionRows = publication?.versions ?? [];
  const version1Row = versionRows.find((v) => v.versionNumber === 1);
  const version2Row = versionRows.find((v) => v.versionNumber === 2);
  const versionOrderDeterministic =
    versionSummary.versionNumbers.length >= 2 &&
    versionSummary.versionNumbers.every(
      (n, i) => i === 0 || n > versionSummary.versionNumbers[i - 1]!,
    );

  printSection("PUBLICATION_VERSION_HISTORY", {
    VERSION_1: versionSummary.versionNumbers.includes(1) ? "EXISTS" : "MISSING",
    VERSION_2: versionSummary.versionNumbers.includes(2) ? "EXISTS" : "MISSING",
    VERSION_ORDER: versionSummary.versionNumbers,
    VERSION_ORDER_DETERMINISTIC: versionOrderDeterministic,
    LATEST_VERSION: versionSummary.versionNumbers.at(-1) ?? null,
    V1_LIFECYCLE: version1Row?.lifecycleStatus ?? null,
    V2_LIFECYCLE: version2Row?.lifecycleStatus ?? null,
    PUBLICATION_LIFECYCLE: publication?.lifecycleStatus ?? null,
    HISTORICAL_READ_PATH:
      "FinancePublicationVersion → snapshotPayloadJson → publication presentation",
    LIVE_FIN05_REBUILD_REQUIRED: false,
  });

  if (!versionSummary.version2Exists || !versionSummary.exists || !versionSummary.publicationId) {
    throw new Error("STOP: Expected Version 1 and Version 2 on designated STAGE tenant/year.");
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

  const v1Read = await loadFinancePublicationVersionSnapshot(prisma, ctx, {
    publicationId: versionSummary.publicationId,
    versionNumber: 1,
  });
  const v2Read = await loadFinancePublicationVersionSnapshot(prisma, ctx, {
    publicationId: versionSummary.publicationId,
    versionNumber: 2,
  });
  if (!v1Read.ok || !v2Read.ok) {
    throw new Error("Failed to load Version 1 or Version 2 via publication snapshot read path.");
  }

  const v1Metrics = metricsFromStoredSnapshot(v1Read.snapshot);
  const v2Metrics = metricsFromStoredSnapshot(v2Read.snapshot);

  const v1Immutable = metricsMatchPoWholeChfPresentation(
    v1Metrics,
    R5_V1_BASELINE,
    v1Read.snapshot.currencyCode,
  );
  const v2MatchesStateB = metricsMatchPoWholeChfPresentation(
    v2Metrics,
    R5_LIVE_AFTER_MUTATION,
    v2Read.snapshot.currencyCode,
  );
  const liveMatchesStateB = metricsMatchPoWholeChfPresentation(
    liveMetrics,
    R5_LIVE_AFTER_MUTATION,
    currencyCode,
  );
  const v2MatchesLiveB = metricsMatchPoWholeChfPresentation(v2Metrics, liveMetrics, currencyCode);

  printSection("VERSION_CHECKPOINTS", {
    V1_IMMUTABLE: v1Immutable,
    V1_SNAPSHOT_DIGEST: snapshotPayloadDigest(v1Read.snapshot),
    V1_METRICS_MINOR_UNITS: v1Metrics,
    V2_SNAPSHOT_STATE: v2MatchesStateB ? "STATE_B" : "UNEXPECTED",
    V2_SNAPSHOT_DIGEST: snapshotPayloadDigest(v2Read.snapshot),
    V2_METRICS_MINOR_UNITS: v2Metrics,
    LIVE_MATCHES_STATE_B: liveMatchesStateB,
    V2_MATCHES_LIVE_B: v2MatchesLiveB,
    V1_DIFFERS_FROM_V2:
      metricsMatchPoWholeChfPresentation(v1Metrics, v2Metrics, currencyCode) === false,
  });

  const allPass =
    v1Immutable &&
    v2MatchesStateB &&
    liveMatchesStateB &&
    v2MatchesLiveB &&
    versionSummary.versionNumbers.at(-1) === 2 &&
    version1Row?.lifecycleStatus === "SUPERSEDED" &&
    version2Row?.lifecycleStatus === "PUBLISHED";

  printSection("RESULT", {
    PUBLICATION_VERSION_HISTORY: allPass ? "PASS" : "FAIL",
    PRODUCTION_TOUCHED: "NO",
  });

  if (!allPass) {
    throw new Error("R7 STAGE publication closure verification failed.");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
