/**
 * SCE-FIN-04B-02 — designated STAGE migration safety + projection integrity inventory.
 *
 * Pre-apply inventory (read-only):
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04b-02-stage-migration-verify.ts --phase=pre
 *
 * Apply migration (guarded deploy only — not part of FIN-04B-02 implementation):
 *   ... --apply
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

export const MIGRATION_NAME =
  "20261023200000_sce_finance_04b_02_projection_persistence";

export type ProjectionIntegrityCounts = {
  BROKEN_PROJECTION_YEAR_REFERENCES: number;
  BROKEN_PROJECTION_TENANT_REFERENCES: number;
  BROKEN_CURRENT_PROJECTION_POINTERS: number;
  CURRENT_POINTER_WRONG_PROJECTION: number;
  CURRENT_POINTER_WRONG_TENANT: number;
  DUPLICATE_PROJECTION_YEAR_CONTAINERS: number;
  DUPLICATE_PROJECTION_VERSION_NUMBERS: number;
  DUPLICATE_PROJECTION_ACCOUNT_LINES: number;
  MULTIPLE_CURRENT_PROJECTION_VERSIONS: number;
  CURRENT_STATUS_POINTER_MISMATCH: number;
  INVALID_PROJECTION_RANGES: number;
  CROSS_TENANT_PROJECTION_ACCOUNTS: number;
};

function assertDesignatedStage(): void {
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

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

export async function loadProjectionIntegrityCounts(): Promise<ProjectionIntegrityCounts> {
  const projectionTable = await tableExists("FinanceProjection");
  if (!projectionTable) {
    return {
      BROKEN_PROJECTION_YEAR_REFERENCES: 0,
      BROKEN_PROJECTION_TENANT_REFERENCES: 0,
      BROKEN_CURRENT_PROJECTION_POINTERS: 0,
      CURRENT_POINTER_WRONG_PROJECTION: 0,
      CURRENT_POINTER_WRONG_TENANT: 0,
      DUPLICATE_PROJECTION_YEAR_CONTAINERS: 0,
      DUPLICATE_PROJECTION_VERSION_NUMBERS: 0,
      DUPLICATE_PROJECTION_ACCOUNT_LINES: 0,
      MULTIPLE_CURRENT_PROJECTION_VERSIONS: 0,
      CURRENT_STATUS_POINTER_MISMATCH: 0,
      INVALID_PROJECTION_RANGES: 0,
      CROSS_TENANT_PROJECTION_ACCOUNTS: 0,
    };
  }

  const brokenYear = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceProjection" fp
    LEFT JOIN "FinanceYear" fy ON fy.id = fp."financeYearId"
    WHERE fy.id IS NULL
  `;
  const brokenTenant = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceProjection" fp
    LEFT JOIN "Tenant" t ON t.id = fp."tenantId"
    WHERE t.id IS NULL
  `;
  const brokenCurrentPointer = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceProjection" fp
    WHERE fp."currentProjectionVersionId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "FinanceProjectionVersion" v WHERE v.id = fp."currentProjectionVersionId"
      )
  `;
  const currentPointerWrongProjection = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceProjection" fp
    JOIN "FinanceProjectionVersion" v ON v.id = fp."currentProjectionVersionId"
    WHERE fp."currentProjectionVersionId" IS NOT NULL
      AND v."financeProjectionId" <> fp.id
  `;
  const currentPointerWrongTenant = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceProjection" fp
    JOIN "FinanceProjectionVersion" v ON v.id = fp."currentProjectionVersionId"
    JOIN "FinanceProjection" owner ON owner.id = v."financeProjectionId"
    WHERE fp."currentProjectionVersionId" IS NOT NULL
      AND owner."tenantId" <> fp."tenantId"
  `;
  const duplicateYearContainers = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COALESCE(SUM(cnt - 1), 0)::bigint AS count
    FROM (
      SELECT COUNT(*)::int AS cnt
      FROM "FinanceProjection"
      GROUP BY "tenantId", "financeYearId"
      HAVING COUNT(*) > 1
    ) dup
  `;
  const duplicateVersionNumbers = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COALESCE(SUM(cnt - 1), 0)::bigint AS count
    FROM (
      SELECT COUNT(*)::int AS cnt
      FROM "FinanceProjectionVersion"
      GROUP BY "financeProjectionId", "versionNumber"
      HAVING COUNT(*) > 1
    ) dup
  `;
  const duplicateAccountLines = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COALESCE(SUM(cnt - 1), 0)::bigint AS count
    FROM (
      SELECT COUNT(*)::int AS cnt
      FROM "FinanceProjectionLine"
      GROUP BY "projectionVersionId", "financialAccountId"
      HAVING COUNT(*) > 1
    ) dup
  `;
  const multipleCurrentVersions = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COALESCE(SUM(cnt - 1), 0)::bigint AS count
    FROM (
      SELECT COUNT(*)::int AS cnt
      FROM "FinanceProjectionVersion"
      WHERE status = 'CURRENT'
      GROUP BY "financeProjectionId"
      HAVING COUNT(*) > 1
    ) dup
  `;
  const currentStatusPointerMismatch = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceProjection" fp
    JOIN "FinanceProjectionVersion" v ON v.id = fp."currentProjectionVersionId"
    WHERE fp."currentProjectionVersionId" IS NOT NULL
      AND v.status <> 'CURRENT'
  `;
  const invalidRanges = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceProjectionLine" l
    WHERE (
      (l."lowerBoundMinor" IS NOT NULL OR l."upperBoundMinor" IS NOT NULL)
      AND (
        l."projectedAmountMinor" IS NULL
        OR l."lowerBoundMinor" IS NULL
        OR l."upperBoundMinor" IS NULL
        OR l."lowerBoundMinor" > l."projectedAmountMinor"
        OR l."projectedAmountMinor" > l."upperBoundMinor"
      )
    )
  `;
  const crossTenantAccounts = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceProjectionLine" l
    JOIN "FinanceProjectionVersion" v ON v.id = l."projectionVersionId"
    JOIN "FinanceProjection" fp ON fp.id = v."financeProjectionId"
    JOIN "FinancialAccount" a ON a.id = l."financialAccountId"
    WHERE a."tenantId" <> fp."tenantId"
  `;

  return {
    BROKEN_PROJECTION_YEAR_REFERENCES: Number(brokenYear[0]?.count ?? 0),
    BROKEN_PROJECTION_TENANT_REFERENCES: Number(brokenTenant[0]?.count ?? 0),
    BROKEN_CURRENT_PROJECTION_POINTERS: Number(brokenCurrentPointer[0]?.count ?? 0),
    CURRENT_POINTER_WRONG_PROJECTION: Number(currentPointerWrongProjection[0]?.count ?? 0),
    CURRENT_POINTER_WRONG_TENANT: Number(currentPointerWrongTenant[0]?.count ?? 0),
    DUPLICATE_PROJECTION_YEAR_CONTAINERS: Number(duplicateYearContainers[0]?.count ?? 0),
    DUPLICATE_PROJECTION_VERSION_NUMBERS: Number(duplicateVersionNumbers[0]?.count ?? 0),
    DUPLICATE_PROJECTION_ACCOUNT_LINES: Number(duplicateAccountLines[0]?.count ?? 0),
    MULTIPLE_CURRENT_PROJECTION_VERSIONS: Number(multipleCurrentVersions[0]?.count ?? 0),
    CURRENT_STATUS_POINTER_MISMATCH: Number(currentStatusPointerMismatch[0]?.count ?? 0),
    INVALID_PROJECTION_RANGES: Number(invalidRanges[0]?.count ?? 0),
    CROSS_TENANT_PROJECTION_ACCOUNTS: Number(crossTenantAccounts[0]?.count ?? 0),
  };
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  assertDesignatedStage();
  const integrity = await loadProjectionIntegrityCounts();
  console.log(JSON.stringify({ migration: MIGRATION_NAME, integrity }, null, 2));

  if (apply) {
    const result = spawnSync("npm", ["run", "db:migrate:deploy-if-enabled"], {
      stdio: "inherit",
      env: process.env,
    });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
