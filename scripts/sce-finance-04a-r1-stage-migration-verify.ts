/**
 * SCE-FIN-04A-R1 — designated STAGE migration safety + schema parity for forecast foundation.
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04a-r1-stage-migration-verify.ts --phase=pre
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04a-r1-stage-migration-verify.ts --apply
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import { loadForecastWorkspaceSnapshot } from "@/lib/finance/services/finance-forecast-query-service";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

const MIGRATION_NAME =
  "20261023180000_sce_finance_04a_forecast_foundation";

type IntegritySnapshot = {
  tenantCount: number;
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
};

type ForecastIntegrityCounts = {
  BROKEN_FORECAST_YEAR_REFERENCES: number;
  BROKEN_FORECAST_TENANT_REFERENCES: number;
  BROKEN_CURRENT_VERSION_REFERENCES: number;
  CURRENT_VERSION_WRONG_FORECAST: number;
  CURRENT_VERSION_WRONG_TENANT: number;
  DUPLICATE_FORECAST_YEAR_CONTAINERS: number;
  DUPLICATE_FORECAST_VERSION_NUMBERS: number;
  DUPLICATE_FORECAST_ACCOUNT_LINES: number;
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

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function loadIntegritySnapshot(): Promise<IntegritySnapshot> {
  const forecastTables = await tableExists("FinanceForecast");
  const [
    tenantCount,
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
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.financeConfiguration.count(),
    prisma.financeYear.count(),
    prisma.financialAccount.count(),
    prisma.financeBudget.count(),
    prisma.financeBudgetVersion.count(),
    prisma.financeBudgetLine.count(),
    prisma.financeActualEntry.count(),
    forecastTables ? prisma.financeForecast.count() : Promise.resolve(-1),
    forecastTables ? prisma.financeForecastVersion.count() : Promise.resolve(-1),
    forecastTables ? prisma.financeForecastLine.count() : Promise.resolve(-1),
  ]);
  return {
    tenantCount,
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
  };
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

function pendingMigrationIncludesFin04a(statusOutput: string): boolean {
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
  applied: boolean,
): Promise<{
  financeForecastTable: boolean;
  financeForecastVersionTable: boolean;
  financeForecastLineTable: boolean;
  versionStatusEnumValues: string[];
  partialMigration: boolean;
  schemaStateSafe: boolean;
}> {
  const financeForecastTable = await tableExists("FinanceForecast");
  const financeForecastVersionTable = await tableExists("FinanceForecastVersion");
  const financeForecastLineTable = await tableExists("FinanceForecastLine");
  const tablesPresent =
    financeForecastTable && financeForecastVersionTable && financeForecastLineTable;
  const tableWithoutHistory = tablesPresent && !applied;
  const historyWithoutTable = applied && !tablesPresent;
  const partialMigration = tableWithoutHistory || historyWithoutTable;
  const versionStatusEnumValues = financeForecastVersionTable
    ? await enumValues("FinanceForecastVersionStatus")
    : [];
  const schemaStateSafe =
    !partialMigration &&
    (await failedMigrationCount()) === 0 &&
    (applied ? tablesPresent : !tablesPresent);
  return {
    financeForecastTable,
    financeForecastVersionTable,
    financeForecastLineTable,
    versionStatusEnumValues,
    partialMigration,
    schemaStateSafe,
  };
}

async function loadForecastIntegrityCounts(): Promise<ForecastIntegrityCounts> {
  const forecastTable = await tableExists("FinanceForecast");
  if (!forecastTable) {
    return {
      BROKEN_FORECAST_YEAR_REFERENCES: 0,
      BROKEN_FORECAST_TENANT_REFERENCES: 0,
      BROKEN_CURRENT_VERSION_REFERENCES: 0,
      CURRENT_VERSION_WRONG_FORECAST: 0,
      CURRENT_VERSION_WRONG_TENANT: 0,
      DUPLICATE_FORECAST_YEAR_CONTAINERS: 0,
      DUPLICATE_FORECAST_VERSION_NUMBERS: 0,
      DUPLICATE_FORECAST_ACCOUNT_LINES: 0,
    };
  }

  const brokenYear = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceForecast" ff
    LEFT JOIN "FinanceYear" fy ON fy.id = ff."financeYearId"
    WHERE fy.id IS NULL
  `;
  const brokenTenant = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceForecast" ff
    LEFT JOIN "Tenant" t ON t.id = ff."tenantId"
    WHERE t.id IS NULL
  `;
  const brokenCurrentVersion = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceForecast" ff
    WHERE ff."currentVersionId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "FinanceForecastVersion" v WHERE v.id = ff."currentVersionId"
      )
  `;
  const currentVersionWrongForecast = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceForecast" ff
    JOIN "FinanceForecastVersion" v ON v.id = ff."currentVersionId"
    WHERE ff."currentVersionId" IS NOT NULL
      AND v."forecastId" <> ff.id
  `;
  const currentVersionWrongTenant = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "FinanceForecast" ff
    JOIN "FinanceForecastVersion" v ON v.id = ff."currentVersionId"
    JOIN "FinanceForecast" owner ON owner.id = v."forecastId"
    WHERE ff."currentVersionId" IS NOT NULL
      AND owner."tenantId" <> ff."tenantId"
  `;
  const duplicateYearContainers = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COALESCE(SUM(cnt - 1), 0)::bigint AS count
    FROM (
      SELECT COUNT(*)::int AS cnt
      FROM "FinanceForecast"
      GROUP BY "tenantId", "financeYearId"
      HAVING COUNT(*) > 1
    ) dup
  `;
  const duplicateVersionNumbers = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COALESCE(SUM(cnt - 1), 0)::bigint AS count
    FROM (
      SELECT COUNT(*)::int AS cnt
      FROM "FinanceForecastVersion"
      GROUP BY "forecastId", "versionNumber"
      HAVING COUNT(*) > 1
    ) dup
  `;
  const duplicateAccountLines = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COALESCE(SUM(cnt - 1), 0)::bigint AS count
    FROM (
      SELECT COUNT(*)::int AS cnt
      FROM "FinanceForecastLine"
      GROUP BY "forecastVersionId", "financialAccountId"
      HAVING COUNT(*) > 1
    ) dup
  `;

  return {
    BROKEN_FORECAST_YEAR_REFERENCES: Number(brokenYear[0]?.count ?? 0),
    BROKEN_FORECAST_TENANT_REFERENCES: Number(brokenTenant[0]?.count ?? 0),
    BROKEN_CURRENT_VERSION_REFERENCES: Number(brokenCurrentVersion[0]?.count ?? 0),
    CURRENT_VERSION_WRONG_FORECAST: Number(currentVersionWrongForecast[0]?.count ?? 0),
    CURRENT_VERSION_WRONG_TENANT: Number(currentVersionWrongTenant[0]?.count ?? 0),
    DUPLICATE_FORECAST_YEAR_CONTAINERS: Number(duplicateYearContainers[0]?.count ?? 0),
    DUPLICATE_FORECAST_VERSION_NUMBERS: Number(duplicateVersionNumbers[0]?.count ?? 0),
    DUPLICATE_FORECAST_ACCOUNT_LINES: Number(duplicateAccountLines[0]?.count ?? 0),
  };
}

async function verifyApplicationReadPaths(): Promise<Record<string, string>> {
  const out: Record<string, string> = {
    financeForecastPrismaSelect: "NOT_TESTED",
    financeConfigurationRead: "NOT_TESTED",
    financeBudgetBaselinePointerRead: "NOT_TESTED",
    forecastWorkspaceSnapshotRead: "NOT_TESTED",
  };

  await prisma.financeForecast.findFirst({
    select: { id: true, tenantId: true, financeYearId: true, currentVersionId: true },
  });
  out.financeForecastPrismaSelect = "YES";

  const financeConfig = await prisma.financeConfiguration.findFirst({
    select: { tenantId: true, baseCurrency: true, currentFinanceYearId: true },
  });
  out.financeConfigurationRead = financeConfig ? "YES" : "NO_FINANCE_TENANT";

  await prisma.financeBudget.findFirst({
    select: { id: true, currentBaselineVersionId: true },
  });
  out.financeBudgetBaselinePointerRead = "YES";

  if (financeConfig?.tenantId) {
    await loadForecastWorkspaceSnapshot(
      prisma,
      {
        tenantId: financeConfig.tenantId,
        userId: "stage-migration-verify",
        permissionKeys: new Set([
          PERMISSIONS.FINANCE_VIEW,
          PERMISSIONS.FINANCE_FORECAST_VIEW,
        ]),
      },
      null,
    );
    out.forecastWorkspaceSnapshotRead = "YES";
  }

  return out;
}

function existingFinancePreserved(
  pre: IntegritySnapshot,
  post: IntegritySnapshot,
): boolean {
  return (
    pre.tenantCount === post.tenantCount &&
    pre.financeConfigurationCount === post.financeConfigurationCount &&
    pre.financeYearCount === post.financeYearCount &&
    pre.financialAccountCount === post.financialAccountCount &&
    pre.financeBudgetCount === post.financeBudgetCount &&
    pre.financeBudgetVersionCount === post.financeBudgetVersionCount &&
    pre.financeBudgetLineCount === post.financeBudgetLineCount &&
    pre.financeActualEntryCount === post.financeActualEntryCount
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const phase = args.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "post";
  const apply = args.includes("--apply");

  const identity = assertDesignatedStage();
  const preSnapshot = await loadIntegritySnapshot();
  const wasAppliedBefore = await migrationApplied();
  const statusBefore = migrateStatusOutput();
  const preSchema = await assessSchemaState(wasAppliedBefore);

  if (preSchema.partialMigration) {
    throw new Error(
      "Partial FIN-04A migration detected (table/history mismatch). Stop without apply.",
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
    if (!pendingMigrationIncludesFin04a(statusBefore) && wasAppliedBefore) {
      console.log(JSON.stringify({ applySkipped: "ALREADY_APPLIED" }, null, 2));
    } else if (pendingMigrationIncludesFin04a(statusBefore)) {
      applyMigrationGuarded();
      applyInvoked = true;
    }
  }

  const postSnapshot = await loadIntegritySnapshot();
  const status = migrateStatusOutput();
  const appliedCount = await migrationAppliedCount();
  const appliedNow = await migrationApplied();
  const postSchema = await assessSchemaState(appliedNow);
  const forecastIntegrity = await loadForecastIntegrityCounts();

  const expectedEnum = ["CURRENT", "SUPERSEDED"];
  const enumOk =
    postSchema.versionStatusEnumValues.length === expectedEnum.length &&
    expectedEnum.every((v) => postSchema.versionStatusEnumValues.includes(v));

  const tenantCascade = await fkDeleteRule("FinanceForecast", "FinanceForecast_tenantId_fkey");
  const yearRestrict = await fkDeleteRule("FinanceForecast", "FinanceForecast_financeYearId_fkey");
  const accountRestrict = await fkDeleteRule(
    "FinanceForecastLine",
    "FinanceForecastLine_financialAccountId_fkey",
  );
  const currentVersionRestrict = await fkDeleteRule(
    "FinanceForecast",
    "FinanceForecast_currentVersionId_fkey",
  );

  let appCompat: Record<string, string> = {
    financeForecastPrismaSelect: "NOT_TESTED",
    financeConfigurationRead: "NOT_TESTED",
    financeBudgetBaselinePointerRead: "NOT_TESTED",
    forecastWorkspaceSnapshotRead: "NOT_TESTED",
  };
  if (postSchema.financeForecastTable) {
    appCompat = await verifyApplicationReadPaths();
  }

  const integrityAllZero = Object.values(forecastIntegrity).every((n) => n === 0);

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
    financeForecastTablePresent: postSchema.financeForecastTable ? "YES" : "NO",
    financeForecastVersionTablePresent: postSchema.financeForecastVersionTable ? "YES" : "NO",
    financeForecastLineTablePresent: postSchema.financeForecastLineTable ? "YES" : "NO",
    financeForecastVersionStatusEnumValues: postSchema.versionStatusEnumValues,
    financeForecastVersionStatusEnumVerified: enumOk ? "YES" : "NO",
    fkTenantDeleteRule: tenantCascade,
    fkFinanceYearDeleteRule: yearRestrict,
    fkFinancialAccountDeleteRule: accountRestrict,
    fkCurrentVersionDeleteRule: currentVersionRestrict,
    fkConstraintsVerified:
      tenantCascade === "CASCADE" &&
      yearRestrict === "RESTRICT" &&
      accountRestrict === "RESTRICT" &&
      currentVersionRestrict === "RESTRICT"
        ? "YES"
        : "NO",
    forecastIntegrity,
    forecastIntegrityAllZero: integrityAllZero ? "YES" : "NO",
    existingFinanceDataPreserved: existingFinancePreserved(preSnapshot, postSnapshot)
      ? "YES"
      : "NO",
    migrationAppliedToStage: appliedNow ? "YES" : "NO",
    migrationAppliedExactlyOnceCount: appliedCount,
    migrationPendingBeforeApply: pendingMigrationIncludesFin04a(statusBefore) ? "YES" : "NO",
    prismaMigrationState: status.includes("Database schema is up to date")
      ? "UP_TO_DATE"
      : pendingMigrationIncludesFin04a(status)
        ? "PENDING_FIN_04A"
        : "CHECK_STATUS",
    schemaStateSafe: preSchema.schemaStateSafe ? "YES" : "NO",
    applyInvoked,
    wasAppliedBefore,
    applicationCompatibility: appCompat,
  };

  console.log(JSON.stringify(report, null, 2));

  if (applyInvoked && !appliedNow) {
    throw new Error("Migration apply invoked but history row not recorded.");
  }
  if (
    appliedNow &&
    (!postSchema.financeForecastTable ||
      !postSchema.financeForecastVersionTable ||
      !postSchema.financeForecastLineTable ||
      !enumOk)
  ) {
    throw new Error("FIN-04A schema incomplete after migration.");
  }
  if (appliedNow && !integrityAllZero) {
    throw new Error("Forecast integrity violations detected after migration.");
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
