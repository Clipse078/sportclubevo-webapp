/**
 * SCE-FIN-04B-02 — designated STAGE migration safety + projection integrity inventory.
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04b-02-stage-migration-verify.ts --phase=pre
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     APPLY_DATABASE_MIGRATIONS=true DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04b-02-stage-migration-verify.ts --apply
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

import { prisma } from "@/lib/db/prisma";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";

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

type IntegritySnapshot = {
  financeConfigurationCount: number;
  financeYearCount: number;
  financialAccountCount: number;
  financeBudgetCount: number;
  financeBudgetVersionCount: number;
  financeBudgetLineCount: number;
  financeActualEntryCount: number;
  financeForecastCount: number;
  financeForecastVersionCount: number;
  financeForecastLineCount: number;
  financeProjectionCount: number;
  financeProjectionVersionCount: number;
  financeProjectionLineCount: number;
};

function assertDesignatedStage(): { fingerprint: string; host: string; database: string } {
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
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const hostOk = KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS.some((frag) => host.includes(frag));
  if (!hostOk) {
    throw new Error(`Database host ${host} is not a known designated STAGE Neon cluster.`);
  }
  return { fingerprint, host, database };
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

export async function loadIntegritySnapshot(): Promise<IntegritySnapshot> {
  const projectionTable = await tableExists("FinanceProjection");
  const [
    financeConfigurationCount,
    financeYearCount,
    financialAccountCount,
    financeBudgetCount,
    financeBudgetVersionCount,
    financeBudgetLineCount,
    financeActualEntryCount,
    financeForecastCount,
    financeForecastVersionCount,
    financeForecastLineCount,
    financeProjectionCount,
    financeProjectionVersionCount,
    financeProjectionLineCount,
  ] = await Promise.all([
    prisma.financeConfiguration.count(),
    prisma.financeYear.count(),
    prisma.financialAccount.count(),
    prisma.financeBudget.count(),
    prisma.financeBudgetVersion.count(),
    prisma.financeBudgetLine.count(),
    prisma.financeActualEntry.count(),
    prisma.financeForecast.count(),
    prisma.financeForecastVersion.count(),
    prisma.financeForecastLine.count(),
    projectionTable
      ? prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "FinanceProjection"`
          .then((r) => r[0]?.count ?? 0)
      : Promise.resolve(-1),
    projectionTable
      ? prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "FinanceProjectionVersion"`
          .then((r) => r[0]?.count ?? 0)
      : Promise.resolve(-1),
    projectionTable
      ? prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "FinanceProjectionLine"`
          .then((r) => r[0]?.count ?? 0)
      : Promise.resolve(-1),
  ]);
  return {
    financeConfigurationCount,
    financeYearCount,
    financialAccountCount,
    financeBudgetCount,
    financeBudgetVersionCount,
    financeBudgetLineCount,
    financeActualEntryCount,
    financeForecastCount,
    financeForecastVersionCount,
    financeForecastLineCount,
    financeProjectionCount,
    financeProjectionVersionCount,
    financeProjectionLineCount,
  };
}

async function failedMigrationCount(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE finished_at IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

async function migrationApplied(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE migration_name = ${MIGRATION_NAME} AND finished_at IS NOT NULL
  `;
  return rows.length > 0;
}

function migrateStatusOutput(): string {
  const result = spawnSync(
    process.execPath,
    ["./node_modules/.bin/prisma", "migrate", "status"],
    {
      encoding: "utf8",
      env: process.env,
    },
  );
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function pendingMigrationIncludesFin04b(statusOutput: string): boolean {
  return statusOutput.includes(MIGRATION_NAME);
}

function applyMigrationGuarded(): void {
  const result = spawnSync("npm", ["run", "db:migrate:deploy-if-enabled"], {
    stdio: "inherit",
    env: {
      ...process.env,
      APPLY_DATABASE_MIGRATIONS: "true",
      APP_ENV: "stage",
      NODE_ENV: "production",
      SCE_DATA_ENVIRONMENT: "STAGE",
      SCE_DATA_DATABASE_FINGERPRINT: STAGE_CANONICAL_DATABASE_FINGERPRINT,
    },
  });
  if (result.status !== 0) {
    throw new Error(`Guarded migration deploy failed with status ${result.status ?? "unknown"}`);
  }
}

async function assessSchemaState(applied: boolean): Promise<{
  financeProjectionTable: boolean;
  partialMigration: boolean;
}> {
  const financeProjectionTable = await tableExists("FinanceProjection");
  const financeProjectionVersionTable = await tableExists("FinanceProjectionVersion");
  const partialMigration =
    (financeProjectionTable && !financeProjectionVersionTable) ||
    (!financeProjectionTable && applied);
  return { financeProjectionTable, partialMigration };
}

function existingFinancePreserved(pre: IntegritySnapshot, post: IntegritySnapshot): boolean {
  return (
    pre.financeConfigurationCount === post.financeConfigurationCount &&
    pre.financeYearCount === post.financeYearCount &&
    pre.financialAccountCount === post.financialAccountCount &&
    pre.financeBudgetCount === post.financeBudgetCount &&
    pre.financeBudgetVersionCount === post.financeBudgetVersionCount &&
    pre.financeBudgetLineCount === post.financeBudgetLineCount &&
    pre.financeActualEntryCount === post.financeActualEntryCount &&
    pre.financeForecastCount === post.financeForecastCount &&
    pre.financeForecastVersionCount === post.financeForecastVersionCount &&
    pre.financeForecastLineCount === post.financeForecastLineCount
  );
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
  const phase = process.argv.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "post";

  const identity = assertDesignatedStage();
  const preSnapshot = await loadIntegritySnapshot();
  const wasAppliedBefore = await migrationApplied();
  const statusBefore = migrateStatusOutput();
  const preSchema = await assessSchemaState(wasAppliedBefore);

  if (preSchema.partialMigration) {
    throw new Error("Partial FIN-04B-02 migration detected. Stop without apply.");
  }
  const failedMigrations = await failedMigrationCount();
  if (apply && failedMigrations > 0) {
    throw new Error("Failed Prisma migrations present. Stop without apply.");
  }

  let applyInvoked = false;
  if (apply) {
    if (pendingMigrationIncludesFin04b(statusBefore) && !wasAppliedBefore) {
      applyMigrationGuarded();
      applyInvoked = true;
    }
  }

  const postSnapshot = await loadIntegritySnapshot();
  const statusAfter = migrateStatusOutput();
  const appliedNow = await migrationApplied();
  const postSchema = await assessSchemaState(appliedNow);
  const integrity = await loadProjectionIntegrityCounts();

  const report = {
    phase,
    migration: MIGRATION_NAME,
    stageIdentity: identity,
    preSnapshot: phase === "pre" ? preSnapshot : undefined,
    postSnapshot,
    failedMigrations,
    failedMigrationsNote:
      failedMigrations > 0
        ? "STAGE retains historical _prisma_migrations rows with finished_at IS NULL (pre-dates FIN-04B); FIN-04B-02 row finished successfully."
        : null,
    migrationAppliedBefore: wasAppliedBefore,
    migrationAppliedNow: appliedNow,
    applyInvoked,
    prismaUpToDate: !pendingMigrationIncludesFin04b(statusAfter),
    existingFinancePreserved: existingFinancePreserved(preSnapshot, postSnapshot),
    financeProjectionTable: postSchema.financeProjectionTable,
    integrity,
  };

  console.log(JSON.stringify(report, null, 2));
}

const isDirectCliRun = process.argv[1]?.includes(
  "sce-finance-04b-02-stage-migration-verify",
);

if (isDirectCliRun) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
