/**
 * SCE-FINANCE-01E-R4 — designated STAGE migration safety + schema parity closure.
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-01e-r4-stage-migration-verify.ts --phase=pre
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-01e-r4-stage-migration-verify.ts --apply
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

const MIGRATION_NAME =
  "20261022200000_sce_finance_01e_r3_budget_version_base_currency";

type IntegritySnapshot = {
  financeBudgetVersionCount: number;
  approvedFinanceBudgetVersionCount: number;
  approvedLegacyNullBaseCurrencyCount: number;
};

function assertDesignatedStage(): { fingerprint: string; host: string; database: string } {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "production",
  });
  if (runtime.appEnv !== "stage") {
    throw new Error(
      `STAGE identity required: APP_ENV must be "stage" (got ${runtime.appEnv}).`,
    );
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

async function loadIntegritySnapshot(): Promise<IntegritySnapshot> {
  const [financeBudgetVersionCount, approvedFinanceBudgetVersionCount, approvedLegacyNullBaseCurrencyCount] =
    await Promise.all([
      prisma.financeBudgetVersion.count(),
      prisma.financeBudgetVersion.count({ where: { status: "APPROVED" } }),
      prisma.financeBudgetVersion.count({
        where: { status: "APPROVED", baseCurrency: null },
      }),
    ]);
  return {
    financeBudgetVersionCount,
    approvedFinanceBudgetVersionCount,
    approvedLegacyNullBaseCurrencyCount,
  };
}

async function migrationAppliedCount(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "_prisma_migrations"
    WHERE migration_name = ${MIGRATION_NAME}
      AND finished_at IS NOT NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

async function migrationApplied(): Promise<boolean> {
  return (await migrationAppliedCount()) > 0;
}

async function baseCurrencyColumnPresent(): Promise<boolean> {
  const col = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'FinanceBudgetVersion'
        AND column_name = 'baseCurrency'
    ) AS exists
  `;
  return col[0]?.exists === true;
}

function pendingMigrationIncludesR3(statusOutput: string): boolean {
  return statusOutput.includes(MIGRATION_NAME);
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const phase = args.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "post";
  const apply = args.includes("--apply");

  const identity = assertDesignatedStage();
  const preSnapshot = await loadIntegritySnapshot();
  const wasAppliedBefore = await migrationApplied();

  let applyInvoked = false;
  if (apply && !wasAppliedBefore) {
    applyMigrationGuarded();
    applyInvoked = true;
  }

  const postSnapshot = await loadIntegritySnapshot();
  const status = migrateStatusOutput();
  const appliedCount = await migrationAppliedCount();
  const schemaOk = await baseCurrencyColumnPresent();
  const historyAndPhysicalAgree =
    schemaOk && (await migrationApplied()) && !pendingMigrationIncludesR3(status);

  let financeBudgetVersionSelectOk: "NOT_TESTED" | "YES" = "NOT_TESTED";
  if (schemaOk) {
    await prisma.financeBudgetVersion.findFirst({
      select: { id: true, baseCurrency: true },
    });
    financeBudgetVersionSelectOk = "YES";
  }

  const report: Record<string, unknown> = {
    designatedStageIdentityVerified: "YES",
    appEnvVerified: "stage",
    sceDataEnvironmentVerified: "STAGE",
    databaseFingerprintVerified: identity.fingerprint,
    stageHost: identity.host,
    stageDatabaseName: identity.database,
    migrationName: MIGRATION_NAME,
    prodTouched: "NO",
    phase,
    preMigrationCounts: preSnapshot,
    postMigrationCounts: postSnapshot,
    financeBudgetVersionRowsPreserved:
      preSnapshot.financeBudgetVersionCount === postSnapshot.financeBudgetVersionCount
        ? "YES"
        : "NO",
    approvedBaselineCountPreserved:
      preSnapshot.approvedFinanceBudgetVersionCount ===
      postSnapshot.approvedFinanceBudgetVersionCount
        ? "YES"
        : "NO",
    legacyApprovedNullBaseCurrencyPreserved:
      applyInvoked
        ? postSnapshot.approvedLegacyNullBaseCurrencyCount >=
          preSnapshot.approvedLegacyNullBaseCurrencyCount
          ? "YES"
          : "CHECK"
        : "NOT_APPLICABLE",
    migrationAppliedToStage: (await migrationApplied()) ? "YES" : "NO",
    migrationAppliedExactlyOnceCount: appliedCount,
    baseCurrencyColumnExists: schemaOk ? "YES" : "NO",
    prismaMigrationState: status.includes("Database schema is up to date")
      ? "UP_TO_DATE"
      : pendingMigrationIncludesR3(status)
        ? "PENDING_R3"
        : "CHECK_STATUS",
    schemaDrift: historyAndPhysicalAgree ? "NO" : "CHECK",
    applyInvoked,
    financeBudgetVersionSelectOk: financeBudgetVersionSelectOk,
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
