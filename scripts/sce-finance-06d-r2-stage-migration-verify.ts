/**
 * SCE-FIN-06D-R2 — designated STAGE migration safety + publication share schema parity.
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-06d-r2-stage-migration-verify.ts --phase=pre
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
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

const MIGRATION_R1 = "20261026120000_sce_finance_06d_publication_sharing";
const MIGRATION_R2 = "20261026143000_sce_finance_06d_r2_share_public_token";

type ShareSchemaSnapshot = {
  financePublicationShareTable: boolean;
  publicTokenColumn: boolean;
  shareKindColumn: boolean;
  publicTokenUniqueIndex: boolean;
  activeDefaultPartialUniqueIndex: boolean;
  financePublicationShareCount: number;
  appliedMigration120000: boolean;
  appliedMigration143000: boolean;
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

async function loadShareSchemaSnapshot(): Promise<ShareSchemaSnapshot> {
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'FinancePublicationShare'
  `;
  const financePublicationShareTable = tables.length > 0;

  const columns = financePublicationShareTable
    ? await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'FinancePublicationShare'
          AND column_name IN ('publicToken', 'shareKind')
      `
    : [];
  const columnNames = new Set(columns.map((row) => row.column_name));

  const indexes = financePublicationShareTable
    ? await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'FinancePublicationShare'
          AND indexname IN (
            'FinancePublicationShare_publicToken_key',
            'FinancePublicationShare_active_default_per_version_key'
          )
      `
    : [];
  const indexNames = new Set(indexes.map((row) => row.indexname));

  const migrations = await prisma.$queryRaw<
    Array<{ migration_name: string; finished_at: Date | null }>
  >`
    SELECT migration_name, finished_at
    FROM _prisma_migrations
    WHERE migration_name IN (
      '20261026120000_sce_finance_06d_publication_sharing',
      '20261026143000_sce_finance_06d_r2_share_public_token'
    )
  `;
  const applied = new Map(migrations.map((row) => [row.migration_name, row.finished_at != null]));

  let financePublicationShareCount = 0;
  if (financePublicationShareTable) {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "FinancePublicationShare"
    `;
    financePublicationShareCount = Number(rows[0]?.count ?? 0);
  }

  return {
    financePublicationShareTable,
    publicTokenColumn: columnNames.has("publicToken"),
    shareKindColumn: columnNames.has("shareKind"),
    publicTokenUniqueIndex: indexNames.has("FinancePublicationShare_publicToken_key"),
    activeDefaultPartialUniqueIndex: indexNames.has(
      "FinancePublicationShare_active_default_per_version_key",
    ),
    financePublicationShareCount,
    appliedMigration120000: applied.get(MIGRATION_R1) === true,
    appliedMigration143000: applied.get(MIGRATION_R2) === true,
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
  const snapshot = await loadShareSchemaSnapshot();

  console.log("[fin-06d-r2-stage-migration-verify] phase=", phase);
  console.log("[fin-06d-r2-stage-migration-verify] target=", stage.host, stage.database);
  console.log("[fin-06d-r2-stage-migration-verify] migrations=", MIGRATION_R1, MIGRATION_R2);
  console.log("[fin-06d-r2-stage-migration-verify] schema=", JSON.stringify(snapshot));

  const schemaReady =
    snapshot.financePublicationShareTable &&
    snapshot.publicTokenColumn &&
    snapshot.shareKindColumn &&
    snapshot.publicTokenUniqueIndex &&
    snapshot.activeDefaultPartialUniqueIndex &&
    snapshot.appliedMigration120000 &&
    snapshot.appliedMigration143000;

  if (phase === "pre" && !schemaReady) {
    console.log(
      "[fin-06d-r2-stage-migration-verify] RESULT=SCHEMA_MISSING apply guarded STAGE migration before FIN-06D-R2 Preview UAT",
    );
    process.exitCode = 2;
    return;
  }

  if (phase === "post" && !schemaReady) {
    throw new Error("FinancePublicationShare schema still incomplete after migration apply.");
  }

  if (schemaReady) {
    await prisma.$queryRaw`
      SELECT id, "publicToken", "shareKind"
      FROM "FinancePublicationShare"
      LIMIT 1
    `;
  }

  const status = migrateStatusOutput();
  console.log(
    `[fin-06d-r2-stage-migration-verify] migrate_pending_r1=${pendingMigrationIncludes(MIGRATION_R1, status)}`,
  );
  console.log(
    `[fin-06d-r2-stage-migration-verify] migrate_pending_r2=${pendingMigrationIncludes(MIGRATION_R2, status)}`,
  );
  console.log("[fin-06d-r2-stage-migration-verify] RESULT=OK PRODUCTION_TOUCHED=NO");
}

main()
  .catch((error: unknown) => {
    console.error("[fin-06d-r2-stage-migration-verify] FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
