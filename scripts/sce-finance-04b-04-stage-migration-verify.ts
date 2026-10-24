/**
 * SCE-FIN-04B-04 — designated STAGE migration safety for per-line projection methodology.
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04b-04-stage-migration-verify.ts --phase=pre
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     APPLY_DATABASE_MIGRATIONS=true DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04b-04-stage-migration-verify.ts --apply
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
import {
  loadIntegritySnapshot,
  loadProjectionIntegrityCounts,
  MIGRATION_NAME as MIGRATION_04B_02,
} from "./sce-finance-04b-02-stage-migration-verify";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

export const MIGRATION_NAME =
  "20261023210000_sce_finance_04b_04_projection_line_methodology";

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

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function migrationApplied(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE migration_name = ${name} AND finished_at IS NOT NULL
  `;
  return rows.length > 0;
}

async function migrationAppliedCount(name: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations"
    WHERE migration_name = ${name} AND finished_at IS NOT NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

async function failedMigrationCount(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE finished_at IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
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

function pendingMigrationIncludes(name: string, statusOutput: string): boolean {
  return statusOutput.includes(name);
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

function existingFinancePreserved(
  pre: Awaited<ReturnType<typeof loadIntegritySnapshot>>,
  post: Awaited<ReturnType<typeof loadIntegritySnapshot>>,
): boolean {
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

async function assessLineMethodologySchema(applied: boolean): Promise<{
  lineMethodologyColumn: boolean;
  lineDataSufficiencyColumn: boolean;
  lineConfidenceColumn: boolean;
  partial04b04: boolean;
}> {
  const lineTable = await tableExists("FinanceProjectionLine");
  if (!lineTable) {
    return {
      lineMethodologyColumn: false,
      lineDataSufficiencyColumn: false,
      lineConfidenceColumn: false,
      partial04b04: applied,
    };
  }
  const lineMethodologyColumn = await columnExists("FinanceProjectionLine", "methodologyFamily");
  const lineDataSufficiencyColumn = await columnExists("FinanceProjectionLine", "dataSufficiency");
  const lineConfidenceColumn = await columnExists("FinanceProjectionLine", "confidence");
  const anyColumn =
    lineMethodologyColumn || lineDataSufficiencyColumn || lineConfidenceColumn;
  const allColumns =
    lineMethodologyColumn && lineDataSufficiencyColumn && lineConfidenceColumn;
  const partial04b04 = (anyColumn && !allColumns) || (allColumns && !applied) || (!anyColumn && applied);
  return {
    lineMethodologyColumn,
    lineDataSufficiencyColumn,
    lineConfidenceColumn,
    partial04b04,
  };
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const phase = process.argv.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "post";

  const identity = assertDesignatedStage();
  const preSnapshot = await loadIntegritySnapshot();
  const fin04b02Applied = await migrationApplied(MIGRATION_04B_02);
  const fin04b02AppliedCount = await migrationAppliedCount(MIGRATION_04B_02);
  const wasAppliedBefore = await migrationApplied(MIGRATION_NAME);
  const appliedCountBefore = await migrationAppliedCount(MIGRATION_NAME);
  const statusBefore = migrateStatusOutput();
  const preSchema = await assessLineMethodologySchema(wasAppliedBefore);

  if (!fin04b02Applied || fin04b02AppliedCount !== 1) {
    throw new Error(
      `FIN-04B-02 migration must be applied exactly once (applied=${fin04b02Applied}, count=${fin04b02AppliedCount}).`,
    );
  }
  if (appliedCountBefore > 1) {
    throw new Error(`FIN-04B-04 migration applied more than once (${appliedCountBefore}).`);
  }
  if (preSchema.partial04b04) {
    throw new Error("Partial FIN-04B-04 line methodology schema detected. Stop without apply.");
  }

  const failedMigrations = await failedMigrationCount();

  let applyInvoked = false;
  if (apply) {
    if (pendingMigrationIncludes(MIGRATION_NAME, statusBefore) && !wasAppliedBefore) {
      applyMigrationGuarded();
      applyInvoked = true;
    }
  }

  const postSnapshot = await loadIntegritySnapshot();
  const statusAfter = migrateStatusOutput();
  const appliedNow = await migrationApplied(MIGRATION_NAME);
  const appliedCountNow = await migrationAppliedCount(MIGRATION_NAME);
  const postSchema = await assessLineMethodologySchema(appliedNow);
  const integrity = await loadProjectionIntegrityCounts();

  const report = {
    phase,
    migration: MIGRATION_NAME,
    prerequisiteMigration: MIGRATION_04B_02,
    fin04b02Applied,
    fin04b02AppliedCount,
    stageIdentity: identity,
    preSnapshot: phase === "pre" ? preSnapshot : undefined,
    postSnapshot,
    failedMigrations,
    failedMigrationsNote:
      failedMigrations > 0
        ? "STAGE retains historical _prisma_migrations rows with finished_at IS NULL (pre-dates FIN-04B); verify FIN-04B-04 row finished successfully."
        : null,
    migrationAppliedBefore: wasAppliedBefore,
    migrationAppliedNow: appliedNow,
    migrationAppliedCount: appliedCountNow,
    applyInvoked,
    prismaUpToDate: !pendingMigrationIncludes(MIGRATION_NAME, statusAfter),
    existingFinancePreserved: existingFinancePreserved(preSnapshot, postSnapshot),
    lineMethodologyColumns: postSchema,
    integrity,
  };

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
