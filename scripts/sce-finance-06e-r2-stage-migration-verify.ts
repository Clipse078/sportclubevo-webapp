/**
 * SCE-FIN-06E-R2 — designated STAGE migration + distribute permission parity.
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-06e-r2-stage-migration-verify.ts --phase=pre
 *
 * Apply migrations (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

const MIGRATION_06E = "20261026160000_sce_finance_06e_publication_distribution";
const MIGRATION_R1 = "20261026173000_sce_finance_06e_r1_distribute_permission_backfill";

const FCA_CLUB_ADMIN_ROLE_KEY = "club_admin__fc-allschwil";

type Fin06eStageSnapshot = {
  financePublicationDistributionTable: boolean;
  financePublicationDistributionRecipientTable: boolean;
  distributePermissionCatalogRow: boolean;
  fcaClubAdminHasDistributeGrant: boolean;
  appliedMigration06e: boolean;
  appliedMigrationR1: boolean;
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

async function loadFin06eStageSnapshot(): Promise<Fin06eStageSnapshot> {
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'FinancePublicationDistribution',
        'FinancePublicationDistributionRecipient'
      )
  `;
  const tableNames = new Set(tables.map((row) => row.table_name));

  const distributePermission = await prisma.permission.findUnique({
    where: { key: PERMISSIONS.FINANCE_REPORTING_DISTRIBUTE },
    select: { id: true },
  });

  let fcaClubAdminHasDistributeGrant = false;
  const fcaRole = await prisma.role.findUnique({
    where: { key: FCA_CLUB_ADMIN_ROLE_KEY },
    select: { id: true },
  });
  if (fcaRole && distributePermission) {
    const grant = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: fcaRole.id,
          permissionId: distributePermission.id,
        },
      },
      select: { id: true },
    });
    fcaClubAdminHasDistributeGrant = grant != null;
  }

  const migrations = await prisma.$queryRaw<
    Array<{ migration_name: string; finished_at: Date | null }>
  >`
    SELECT migration_name, finished_at
    FROM _prisma_migrations
    WHERE migration_name IN (
      '20261026160000_sce_finance_06e_publication_distribution',
      '20261026173000_sce_finance_06e_r1_distribute_permission_backfill'
    )
  `;
  const applied = new Map(migrations.map((row) => [row.migration_name, row.finished_at != null]));

  return {
    financePublicationDistributionTable: tableNames.has("FinancePublicationDistribution"),
    financePublicationDistributionRecipientTable: tableNames.has(
      "FinancePublicationDistributionRecipient",
    ),
    distributePermissionCatalogRow: distributePermission != null,
    fcaClubAdminHasDistributeGrant,
    appliedMigration06e: applied.get(MIGRATION_06E) === true,
    appliedMigrationR1: applied.get(MIGRATION_R1) === true,
  };
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
  return statusOutput.includes(name) && statusOutput.includes("have not yet been applied");
}

async function main(): Promise<void> {
  const stage = assertDesignatedStage();
  const phase = process.argv.includes("--phase=post") ? "post" : "pre";
  const snapshot = await loadFin06eStageSnapshot();

  console.log("[fin-06e-r2-stage-migration-verify] phase=", phase);
  console.log("[fin-06e-r2-stage-migration-verify] target=", stage.host, stage.database);
  console.log("[fin-06e-r2-stage-migration-verify] migrations=", MIGRATION_06E, MIGRATION_R1);
  console.log("[fin-06e-r2-stage-migration-verify] snapshot=", JSON.stringify(snapshot));

  const ready =
    snapshot.financePublicationDistributionTable &&
    snapshot.financePublicationDistributionRecipientTable &&
    snapshot.distributePermissionCatalogRow &&
    snapshot.fcaClubAdminHasDistributeGrant &&
    snapshot.appliedMigration06e &&
    snapshot.appliedMigrationR1;

  if (phase === "pre" && !ready) {
    console.log(
      "[fin-06e-r2-stage-migration-verify] RESULT=SCHEMA_OR_PERMISSION_MISSING apply guarded STAGE migration before FIN-06E Preview UAT",
    );
    process.exitCode = 2;
    return;
  }

  if (phase === "post" && !ready) {
    throw new Error(
      "FIN-06E distribution schema or finance.reporting.distribute grants still incomplete after migration apply.",
    );
  }

  if (ready) {
    await prisma.$queryRaw`
      SELECT id, status
      FROM "FinancePublicationDistribution"
      LIMIT 1
    `;
  }

  const status = migrateStatusOutput();
  console.log(
    `[fin-06e-r2-stage-migration-verify] migrate_pending_06e=${pendingMigrationIncludes(MIGRATION_06E, status)}`,
  );
  console.log(
    `[fin-06e-r2-stage-migration-verify] migrate_pending_r1=${pendingMigrationIncludes(MIGRATION_R1, status)}`,
  );
  console.log("[fin-06e-r2-stage-migration-verify] RESULT=OK PRODUCTION_TOUCHED=NO");
}

main()
  .catch((error: unknown) => {
    console.error("[fin-06e-r2-stage-migration-verify] FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
