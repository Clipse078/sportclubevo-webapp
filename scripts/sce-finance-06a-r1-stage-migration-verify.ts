/**
 * SCE-FIN-06A-R1 — designated STAGE migration safety + publication schema parity.
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-06a-r1-stage-migration-verify.ts --phase=pre
 *
 * Apply migration (guarded deploy only):
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

const MIGRATION_NAME =
  "20261025140000_sce_finance_06a_publishing_sharing_foundation";

type PublicationSchemaSnapshot = {
  financePublicationTable: boolean;
  financePublicationVersionTable: boolean;
  versionUniqueIndex: boolean;
  financePublicationCount: number;
  financePublicationVersionCount: number;
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

async function loadPublicationSchemaSnapshot(): Promise<PublicationSchemaSnapshot> {
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('FinancePublication', 'FinancePublicationVersion')
  `;
  const tableNames = new Set(tables.map((row) => row.table_name));
  const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'FinancePublicationVersion_publicationId_versionNumber_key'
  `;

  let financePublicationCount = 0;
  let financePublicationVersionCount = 0;
  if (tableNames.has("FinancePublication")) {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "FinancePublication"
    `;
    financePublicationCount = Number(rows[0]?.count ?? 0);
  }
  if (tableNames.has("FinancePublicationVersion")) {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "FinancePublicationVersion"
    `;
    financePublicationVersionCount = Number(rows[0]?.count ?? 0);
  }

  return {
    financePublicationTable: tableNames.has("FinancePublication"),
    financePublicationVersionTable: tableNames.has("FinancePublicationVersion"),
    versionUniqueIndex: indexes.length > 0,
    financePublicationCount,
    financePublicationVersionCount,
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

function pendingMigrationIncludesFin06a(statusOutput: string): boolean {
  return (
    statusOutput.includes(MIGRATION_NAME) &&
    statusOutput.includes("have not yet been applied")
  );
}

async function main(): Promise<void> {
  const stage = assertDesignatedStage();
  const phase = process.argv.includes("--phase=post") ? "post" : "pre";
  const snapshot = await loadPublicationSchemaSnapshot();

  console.log("[fin-06a-r1-stage-migration-verify] phase=", phase);
  console.log("[fin-06a-r1-stage-migration-verify] target=", stage.host, stage.database);
  console.log("[fin-06a-r1-stage-migration-verify] migration=", MIGRATION_NAME);
  console.log("[fin-06a-r1-stage-migration-verify] schema=", JSON.stringify(snapshot));

  const schemaReady =
    snapshot.financePublicationTable &&
    snapshot.financePublicationVersionTable &&
    snapshot.versionUniqueIndex;

  if (phase === "pre" && !schemaReady) {
    console.log(
      "[fin-06a-r1-stage-migration-verify] RESULT=SCHEMA_MISSING apply guarded migration before FIN-06B Preview UAT",
    );
    process.exitCode = 2;
    return;
  }

  if (phase === "post" && !schemaReady) {
    throw new Error("Publication schema still incomplete after migration apply.");
  }

  const status = migrateStatusOutput();
  console.log(
    `[fin-06a-r1-stage-migration-verify] migrate_pending=${pendingMigrationIncludesFin06a(status)}`,
  );
  console.log("[fin-06a-r1-stage-migration-verify] RESULT=OK PRODUCTION_TOUCHED=NO");
}

main()
  .catch((error: unknown) => {
    console.error("[fin-06a-r1-stage-migration-verify] FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
