/**
 * SCE-FIN-03A-R1 — designated STAGE migration safety + schema parity for actuals foundation.
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-03a-r1-stage-migration-verify.ts --phase=pre
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-03a-r1-stage-migration-verify.ts --apply
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import { loadActualsWorkspaceSnapshot } from "@/lib/finance/services/finance-actual-query-service";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

const MIGRATION_NAME =
  "20261023120000_sce_finance_03a_actuals_foundation";

type IntegritySnapshot = {
  tenantCount: number;
  financeYearCount: number;
  financialAccountCount: number;
  financeBudgetCount: number;
  financeBudgetVersionCount: number;
  financeActualEntryCount: number;
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
  const actualsTablePresent = await tableExists("FinanceActualEntry");
  const [
    tenantCount,
    financeYearCount,
    financialAccountCount,
    financeBudgetCount,
    financeBudgetVersionCount,
    financeActualEntryCount,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.financeYear.count(),
    prisma.financialAccount.count(),
    prisma.financeBudget.count(),
    prisma.financeBudgetVersion.count(),
    actualsTablePresent ? prisma.financeActualEntry.count() : Promise.resolve(-1),
  ]);
  return {
    tenantCount,
    financeYearCount,
    financialAccountCount,
    financeBudgetCount,
    financeBudgetVersionCount,
    financeActualEntryCount,
  };
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function enumValues(enumName: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ enumlabel: string }[]>`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = ${enumName}
    ORDER BY e.enumsortorder
  `;
  return rows.map((r) => r.enumlabel);
}

async function fkDeleteRule(
  tableName: string,
  constraintName: string,
): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ delete_rule: string }[]>`
    SELECT rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = ${tableName}
      AND tc.constraint_name = ${constraintName}
  `;
  return rows[0]?.delete_rule ?? null;
}

async function failedMigrationCount(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "_prisma_migrations"
    WHERE finished_at IS NULL
      AND rolled_back_at IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
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

function pendingMigrationIncludesFin03a(statusOutput: string): boolean {
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

async function assessSchemaState(
  status: string,
  applied: boolean,
): Promise<{
  financeActualEntryTable: boolean;
  sourceEnumValues: string[];
  schemaStateSafe: boolean;
  partialMigration: boolean;
}> {
  const financeActualEntryTable = await tableExists("FinanceActualEntry");
  const sourceEnumValues = financeActualEntryTable
    ? await enumValues("FinanceActualEntrySource")
    : [];
  const tableWithoutHistory = financeActualEntryTable && !applied;
  const historyWithoutTable = applied && !financeActualEntryTable;
  const partialMigration = tableWithoutHistory || historyWithoutTable;
  const pending = pendingMigrationIncludesFin03a(status);
  const schemaStateSafe =
    !partialMigration &&
    (await failedMigrationCount()) === 0 &&
    (pending ? !financeActualEntryTable : financeActualEntryTable);
  return {
    financeActualEntryTable,
    sourceEnumValues,
    schemaStateSafe,
    partialMigration,
  };
}

async function verifyApplicationReadPaths(): Promise<Record<string, string>> {
  const out: Record<string, string> = {
    financeActualEntryPrismaSelect: "NOT_TESTED",
    financeConfigurationRead: "NOT_TESTED",
    financeBudgetRead: "NOT_TESTED",
    financeBudgetVersionRead: "NOT_TESTED",
    actualsWorkspaceSnapshotRead: "NOT_TESTED",
  };

  await prisma.financeActualEntry.findFirst({
    select: { id: true, source: true, amountMinor: true },
  });
  out.financeActualEntryPrismaSelect = "YES";

  await prisma.financeConfiguration.findFirst({
    select: { tenantId: true, baseCurrency: true, currentFinanceYearId: true },
  });
  out.financeConfigurationRead = "YES";

  await prisma.financeBudget.findFirst({
    select: { id: true, currentBaselineVersionId: true },
  });
  out.financeBudgetRead = "YES";

  await prisma.financeBudgetVersion.findFirst({
    select: { id: true, baseCurrency: true, status: true },
  });
  out.financeBudgetVersionRead = "YES";

  const tenantWithFinance = await prisma.financeConfiguration.findFirst({
    select: { tenantId: true },
  });
  if (tenantWithFinance?.tenantId) {
    await loadActualsWorkspaceSnapshot(
      prisma,
      {
        tenantId: tenantWithFinance.tenantId,
        userId: "stage-migration-verify",
        permissionKeys: new Set([
          PERMISSIONS.FINANCE_VIEW,
          PERMISSIONS.FINANCE_BUDGET_VIEW,
          PERMISSIONS.FINANCE_ACTUAL_VIEW,
        ]),
      },
      { requestedYearId: null, comparisonMode: "FULL_YEAR" },
    );
    out.actualsWorkspaceSnapshotRead = "YES";
  } else {
    out.actualsWorkspaceSnapshotRead = "NO_FINANCE_TENANT";
  }

  return out;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const phase = args.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "post";
  const apply = args.includes("--apply");

  const identity = assertDesignatedStage();
  const preSnapshot = await loadIntegritySnapshot();
  const wasAppliedBefore = await migrationApplied();
  const statusBefore = migrateStatusOutput();
  const preSchema = await assessSchemaState(statusBefore, wasAppliedBefore);

  if (preSchema.partialMigration) {
    throw new Error(
      "Partial FIN-03A migration detected (table/history mismatch). Stop without apply.",
    );
  }
  if ((await failedMigrationCount()) > 0) {
    throw new Error("Failed Prisma migrations present. Stop without apply.");
  }

  let applyInvoked = false;
  if (apply) {
    if (!preSchema.schemaStateSafe) {
      throw new Error("SCHEMA_STATE_SAFE = NO — refusing guarded apply.");
    }
    if (!pendingMigrationIncludesFin03a(statusBefore) && wasAppliedBefore) {
      console.log(JSON.stringify({ applySkipped: "ALREADY_APPLIED" }, null, 2));
    } else if (pendingMigrationIncludesFin03a(statusBefore)) {
      applyMigrationGuarded();
      applyInvoked = true;
    }
  }

  const postSnapshot = await loadIntegritySnapshot();
  const status = migrateStatusOutput();
  const appliedCount = await migrationAppliedCount();
  const appliedNow = await migrationApplied();
  const postSchema = await assessSchemaState(status, appliedNow);

  const tenantCascade = await fkDeleteRule(
    "FinanceActualEntry",
    "FinanceActualEntry_tenantId_fkey",
  );
  const yearRestrict = await fkDeleteRule(
    "FinanceActualEntry",
    "FinanceActualEntry_financeYearId_fkey",
  );
  const accountRestrict = await fkDeleteRule(
    "FinanceActualEntry",
    "FinanceActualEntry_financialAccountId_fkey",
  );

  const expectedEnum = ["MANUAL", "IMPORT", "SYSTEM"];
  const enumOk =
    postSchema.sourceEnumValues.length === expectedEnum.length &&
    expectedEnum.every((v) => postSchema.sourceEnumValues.includes(v));

  let appCompat: Record<string, string> = {
    financeActualEntryPrismaSelect: "NOT_TESTED",
    financeConfigurationRead: "NOT_TESTED",
    financeBudgetRead: "NOT_TESTED",
    financeBudgetVersionRead: "NOT_TESTED",
    actualsWorkspaceSnapshotRead: "NOT_TESTED",
  };
  if (postSchema.financeActualEntryTable) {
    appCompat = await verifyApplicationReadPaths();
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
    failedPrismaMigrations: await failedMigrationCount(),
    preMigrationCounts: preSnapshot,
    postMigrationCounts: postSnapshot,
    financeActualEntryTablePresent: postSchema.financeActualEntryTable ? "YES" : "NO",
    financeActualEntrySourceEnumValues: postSchema.sourceEnumValues,
    financeActualEntrySourceEnumVerified: enumOk ? "YES" : "NO",
    fkTenantDeleteRule: tenantCascade,
    fkFinanceYearDeleteRule: yearRestrict,
    fkFinancialAccountDeleteRule: accountRestrict,
    fkConstraintsVerified:
      tenantCascade === "CASCADE" &&
      yearRestrict === "RESTRICT" &&
      accountRestrict === "RESTRICT"
        ? "YES"
        : "NO",
    existingFinanceDataPreserved:
      preSnapshot.tenantCount === postSnapshot.tenantCount &&
      preSnapshot.financeYearCount === postSnapshot.financeYearCount &&
      preSnapshot.financialAccountCount === postSnapshot.financialAccountCount &&
      preSnapshot.financeBudgetCount === postSnapshot.financeBudgetCount &&
      preSnapshot.financeBudgetVersionCount === postSnapshot.financeBudgetVersionCount
        ? "YES"
        : "NO",
    migrationAppliedToStage: appliedNow ? "YES" : "NO",
    migrationAppliedExactlyOnceCount: appliedCount,
    migrationPendingBeforeApply: pendingMigrationIncludesFin03a(statusBefore) ? "YES" : "NO",
    prismaMigrationState: status.includes("Database schema is up to date")
      ? "UP_TO_DATE"
      : pendingMigrationIncludesFin03a(status)
        ? "PENDING_FIN_03A"
        : "CHECK_STATUS",
    schemaDrift:
      postSchema.financeActualEntryTable && appliedNow && !pendingMigrationIncludesFin03a(status)
        ? "NO"
        : "CHECK",
    schemaStateSafe: preSchema.schemaStateSafe ? "YES" : "NO",
    applyInvoked,
    wasAppliedBefore,
    applicationCompatibility: appCompat,
  };

  console.log(JSON.stringify(report, null, 2));

  if (applyInvoked && !appliedNow) {
    throw new Error("Migration apply invoked but history row not recorded.");
  }
  if (appliedNow && (!postSchema.financeActualEntryTable || !enumOk)) {
    throw new Error("FIN-03A schema incomplete after migration.");
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
