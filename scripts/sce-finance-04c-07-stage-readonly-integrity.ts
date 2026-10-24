/**
 * SCE-FIN-04C-07 — read-only FC Allschwil rolling forecast integrity inventory on designated STAGE.
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04c-07-stage-readonly-integrity.ts
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { FCA_TENANT_KEY } from "@/lib/finance/uat/sce-finance-04b-uat-projection-data";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

export type FcaForecastIntegrityReport = {
  tenantKey: string;
  tenantId: string;
  financeForecastCount: number;
  forecasts: Array<{
    forecastId: string;
    financeYearName: string;
    currentVersionId: string | null;
    currentVersionNumber: number | null;
    currentStatus: string | null;
    currentRevisionLabel: string | null;
    currentRevisionSource: string | null;
    pointerMatchesCurrentStatus: boolean;
    currentVersionCount: number;
    supersededCount: number;
    maxVersionNumber: number;
    versions: Array<{
      id: string;
      versionNumber: number;
      status: string;
      revisionLabel: string | null;
      revisionSource: string | null;
      previousVersionId: string | null;
      scenarioKey: string | null;
      lineCount: number;
    }>;
    projectionVersionCount: number;
    adoptionCount: number;
    uatMarkerPresent: boolean;
  }>;
  stageMutatedByCursorAgent: boolean;
  notes: string[];
};

function assertDesignatedStageReadOnly(): void {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "production",
  });
  if (runtime.appEnv !== "stage") {
    throw new Error(`STAGE identity required: APP_ENV must be "stage" (got ${runtime.appEnv}).`);
  }
  if (getRuntimeDataEnvironment() !== "STAGE") {
    throw new Error("SCE_DATA_ENVIRONMENT must be STAGE.");
  }
  const fingerprint = getDatabaseFingerprintFromEffectivePrismaSource(process.env);
  const configured = process.env.SCE_DATA_DATABASE_FINGERPRINT?.trim().toLowerCase();
  if (configured !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      `SCE_DATA_DATABASE_FINGERPRINT must be ${STAGE_CANONICAL_DATABASE_FINGERPRINT}.`,
    );
  }
  if (fingerprint !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      `Effective database fingerprint ${fingerprint ?? "null"} !== designated STAGE ${STAGE_CANONICAL_DATABASE_FINGERPRINT}.`,
    );
  }
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL missing");
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const hostOk = KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS.some((frag) => host.includes(frag));
  if (!hostOk) {
    throw new Error(`Database host ${host} is not a known designated STAGE Neon cluster.`);
  }
}

export async function loadFcaForecastIntegrityReport(): Promise<FcaForecastIntegrityReport> {
  const tenant = await prisma.tenant.findFirst({
    where: { key: FCA_TENANT_KEY },
    select: { id: true, key: true },
  });
  if (!tenant) {
    throw new Error(`Tenant ${FCA_TENANT_KEY} not found.`);
  }

  const forecasts = await prisma.financeForecast.findMany({
    where: { tenantId: tenant.id },
    include: {
      financeYear: { select: { name: true } },
      currentVersion: {
        select: {
          id: true,
          versionNumber: true,
          status: true,
          revisionLabel: true,
          revisionSource: true,
        },
      },
      versions: {
        orderBy: { versionNumber: "asc" },
        select: {
          id: true,
          versionNumber: true,
          status: true,
          revisionLabel: true,
          revisionSource: true,
          previousVersionId: true,
          scenarioKey: true,
          _count: { select: { lines: true } },
        },
      },
    },
  });

  const projectionRows = await prisma.financeProjection.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { versions: true } } },
  });
  const adoptionCount = await prisma.financeProjectionAdoption.count({
    where: { tenantId: tenant.id },
  });

  const uatEvidence = await prisma.financeActualEntry.findFirst({
    where: {
      tenantId: tenant.id,
      description: { startsWith: "SCE_FIN_04B_UAT_DATA_01|" },
    },
    select: { id: true },
  });

  const notes: string[] = [];
  let stageMutatedByCursorAgent = false;

  const mapped = forecasts.map((forecast) => {
    const currentStatusVersions = forecast.versions.filter((v) => v.status === "CURRENT");
    const pointerMatchesCurrentStatus =
      forecast.currentVersion != null &&
      forecast.currentVersion.status === "CURRENT" &&
      forecast.currentVersion.id === forecast.currentVersionId;
    if (currentStatusVersions.length !== 1) {
      notes.push(
        `Forecast ${forecast.id}: expected exactly one CURRENT status row, found ${currentStatusVersions.length}.`,
      );
    }
    if (!pointerMatchesCurrentStatus) {
      notes.push(`Forecast ${forecast.id}: currentVersionId pointer mismatch with CURRENT row.`);
    }
    const cursorCreatedV4 = forecast.versions.some(
      (v) => v.versionNumber === 4 && v.revisionLabel?.includes("Cursor"),
    );
    if (cursorCreatedV4) {
      stageMutatedByCursorAgent = true;
      notes.push(`Forecast ${forecast.id}: detected version 4 that may be Cursor-created.`);
    }

    const projectionVersionCount = projectionRows
      .filter((p) => p.financeYearId === forecast.financeYearId)
      .reduce((sum, row) => sum + row._count.versions, 0);

    return {
      forecastId: forecast.id,
      financeYearName: forecast.financeYear.name,
      currentVersionId: forecast.currentVersionId,
      currentVersionNumber: forecast.currentVersion?.versionNumber ?? null,
      currentStatus: forecast.currentVersion?.status ?? null,
      currentRevisionLabel: forecast.currentVersion?.revisionLabel ?? null,
      currentRevisionSource: forecast.currentVersion?.revisionSource ?? null,
      pointerMatchesCurrentStatus,
      currentVersionCount: currentStatusVersions.length,
      supersededCount: forecast.versions.filter((v) => v.status === "SUPERSEDED").length,
      maxVersionNumber: Math.max(0, ...forecast.versions.map((v) => v.versionNumber)),
      versions: forecast.versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        status: v.status,
        revisionLabel: v.revisionLabel,
        revisionSource: v.revisionSource,
        previousVersionId: v.previousVersionId,
        scenarioKey: v.scenarioKey,
        lineCount: v._count.lines,
      })),
      projectionVersionCount,
      adoptionCount,
      uatMarkerPresent: Boolean(uatEvidence),
    };
  });

  return {
    tenantKey: tenant.key,
    tenantId: tenant.id,
    financeForecastCount: forecasts.length,
    forecasts: mapped,
    stageMutatedByCursorAgent,
    notes,
  };
}

async function main(): Promise<void> {
  assertDesignatedStageReadOnly();
  const report = await loadFcaForecastIntegrityReport();
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
