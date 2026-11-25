/**
 * SCE tenant record reference columns (#1028 follow-on) — designated STAGE migration safety.
 *
 * Read-only inventory (preflight / post-check):
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     npx tsx scripts/sce-tenant-record-reference-columns-stage-migration-verify.ts --phase=pre
 *
 * Apply migration only (prisma migrate deploy; no post-deploy Club Admin reconciliation):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     APPLY_DATABASE_MIGRATIONS=true DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     npx tsx scripts/sce-tenant-record-reference-columns-stage-migration-verify.ts --apply
 *
 * Apply migration + post-deploy Club Admin reconciliation (canonical guarded runner):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     APPLY_DATABASE_MIGRATIONS=true DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     npm run db:migrate:deploy-if-enabled
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import {
  SCE_TENANT_PUBLIC_REFERENCES_MIGRATION,
  SCE_TENANT_RECORD_REFERENCE_COLUMNS_MIGRATION,
} from "@/lib/tenant-public-reference/sce-tenant-public-reference-migration-handoff";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { resolvePrismaCliPath } from "@/lib/server/prisma-cli";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

const AUTHORIZED_PENDING = new Set([SCE_TENANT_RECORD_REFERENCE_COLUMNS_MIGRATION]);

const MIGRATION_SQL_PATH = resolve(
  process.cwd(),
  `prisma/migrations/${SCE_TENANT_RECORD_REFERENCE_COLUMNS_MIGRATION}/migration.sql`,
);

type RecordReferenceSchemaSnapshot = {
  foundationMigrationApplied: boolean;
  recordColumnsMigrationApplied: boolean;
  migrationChecksum: string | null;
  migrationFinishedAt: string | null;
  tenantPublicNumberColumns: Record<string, boolean>;
  clubStrategyRowCount: number;
  targetRowCount: number;
  clubMeldungRowCount: number;
};

function migrationSqlSha256(): string {
  const body = readFileSync(MIGRATION_SQL_PATH, "utf8");
  return createHash("sha256").update(body).digest("hex");
}

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

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function migrationRow(
  name: string,
): Promise<{ checksum: string; finished_at: Date | null; rolled_back_at: Date | null } | null> {
  const applied = await prisma.$queryRaw<
    Array<{ checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>
  >`
    SELECT checksum, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name = ${name}
    LIMIT 1
  `;
  const row = applied.find((r) => r.finished_at && !r.rolled_back_at);
  return row ?? null;
}

async function loadSchemaSnapshot(): Promise<RecordReferenceSchemaSnapshot> {
  const foundation = await migrationRow(SCE_TENANT_PUBLIC_REFERENCES_MIGRATION);
  const recordCols = await migrationRow(SCE_TENANT_RECORD_REFERENCE_COLUMNS_MIGRATION);
  const tables = ["ClubStrategy", "Target", "ClubMeldung"] as const;
  const tenantPublicNumberColumns: Record<string, boolean> = {};
  for (const table of tables) {
    tenantPublicNumberColumns[table] = await columnExists(table, "tenantPublicNumber");
  }

  const count = async (table: string): Promise<number> =>
    Number(
      (
        await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM "${table}"`,
        )
      )[0]?.count ?? 0,
    );

  return {
    foundationMigrationApplied: Boolean(foundation),
    recordColumnsMigrationApplied: Boolean(recordCols),
    migrationChecksum: recordCols?.checksum ?? null,
    migrationFinishedAt: recordCols?.finished_at?.toISOString?.() ?? null,
    tenantPublicNumberColumns,
    clubStrategyRowCount: await count("ClubStrategy"),
    targetRowCount: await count("Target"),
    clubMeldungRowCount: await count("ClubMeldung"),
  };
}

function migrateStatusOutput(): string {
  const result = spawnSync(
    process.execPath,
    ["./node_modules/.bin/prisma", "migrate", "status"],
    { encoding: "utf8", env: process.env },
  );
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function parsePendingMigrationNames(statusOutput: string): string[] {
  const pending: string[] = [];
  const markers = [
    "The migrations have not yet been applied:",
    "The migration have not yet been applied:",
  ];
  const stopMarker = "The migrations from the database are not found locally";
  const marker = markers.find((candidate) => statusOutput.includes(candidate));
  if (!marker) return pending;
  const idx = statusOutput.indexOf(marker);
  const after = statusOutput.slice(idx + marker.length);
  const stopIdx = after.indexOf(stopMarker);
  const block = stopIdx === -1 ? after : after.slice(0, stopIdx);
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) pending.push(trimmed);
  }
  return pending;
}

function assertPendingOnlyAuthorized(statusOutput: string): void {
  const pending = parsePendingMigrationNames(statusOutput);
  const unauthorized = pending.filter((name) => !AUTHORIZED_PENDING.has(name));
  if (unauthorized.length > 0) {
    throw new Error(
      `Refusing guarded deploy: unauthorized pending migrations: ${unauthorized.join(", ")}`,
    );
  }
  if (pending.length === 0) {
    throw new Error("No pending migrations; nothing to apply.");
  }
  if (!pending.includes(SCE_TENANT_RECORD_REFERENCE_COLUMNS_MIGRATION)) {
    throw new Error(
      `Expected pending ${SCE_TENANT_RECORD_REFERENCE_COLUMNS_MIGRATION}; got: ${pending.join(", ")}`,
    );
  }
}

function schemaReady(snapshot: RecordReferenceSchemaSnapshot): boolean {
  return (
    snapshot.foundationMigrationApplied &&
    snapshot.recordColumnsMigrationApplied &&
    Object.values(snapshot.tenantPublicNumberColumns).every(Boolean)
  );
}

function applyMigrationGuarded(): void {
  assertPendingOnlyAuthorized(migrateStatusOutput());
  const databaseUrl =
    process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  assertOperationalMutationAllowed(
    {
      operationId: "sce-tenant-record-reference-columns-stage-migration",
      databaseUrl,
      explicitIntent: process.env.APPLY_DATABASE_MIGRATIONS === "true",
      allowedRemoteEnvironments: ["stage"],
      operationSpecificAuthorization: process.env.APPLY_DATABASE_MIGRATIONS === "true",
    },
    process.env,
  );

  const prismaCliPath = resolvePrismaCliPath();
  const result = spawnSync(
    process.execPath,
    [prismaCliPath, "migrate", "deploy"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        APP_ENV: "stage",
        NODE_ENV: "production",
        SCE_DATA_ENVIRONMENT: "STAGE",
        SCE_DATA_DATABASE_FINGERPRINT: STAGE_CANONICAL_DATABASE_FINGERPRINT,
      },
    },
  );
  if (result.status !== 0) {
    throw new Error(`prisma migrate deploy failed with status ${result.status ?? "unknown"}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const phase = args.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "post";
  const apply = args.includes("--apply");

  const identity = assertDesignatedStage();
  const preSchema = await loadSchemaSnapshot();
  const statusPre = migrateStatusOutput();
  const pendingPre = parsePendingMigrationNames(statusPre);
  const wasAppliedBefore = preSchema.recordColumnsMigrationApplied;
  const localSqlChecksum = migrationSqlSha256();

  if (!preSchema.foundationMigrationApplied) {
    throw new Error(
      `Prerequisite ${SCE_TENANT_PUBLIC_REFERENCES_MIGRATION} is not applied on STAGE; apply foundation first.`,
    );
  }

  let applyInvoked = false;
  if (apply && !wasAppliedBefore) {
    applyMigrationGuarded();
    applyInvoked = true;
  }

  const postSchema = await loadSchemaSnapshot();
  const statusPost = migrateStatusOutput();
  const pendingPost = parsePendingMigrationNames(statusPost);

  const report: Record<string, unknown> = {
    designatedStageIdentityVerified: "YES",
    appEnvVerified: "stage",
    sceDataEnvironmentVerified: "STAGE",
    databaseFingerprintVerified: identity.fingerprint,
    stageHostFragment: "ep-wispy-hall-aso93dy6",
    stageDatabaseName: identity.database,
    authorizedMigrationOnly: SCE_TENANT_RECORD_REFERENCE_COLUMNS_MIGRATION,
    prerequisiteFoundationMigration: SCE_TENANT_PUBLIC_REFERENCES_MIGRATION,
    foundationAppliedOnStage: preSchema.foundationMigrationApplied ? "YES" : "NO",
    localMigrationSqlSha256: localSqlChecksum,
    prodTouched: "NO",
    sharedDataBackfill: "NO",
    postDeployClubAdminReconciliation: apply
      ? "SKIPPED_BY_AUTHORIZATION_SCOPE"
      : "NOT_INVOKED",
    coupledFullDeployCommand:
      "APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 APPLY_DATABASE_MIGRATIONS=true DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL npm run db:migrate:deploy-if-enabled",
    coupledFullDeployNote:
      "npm run db:migrate:deploy-if-enabled runs scripts/post-deploy-tenant-club-admin-reconciliation.ts after migrate deploy; PO approval for STAGE apply must cover both steps.",
    phase,
    applyInvoked,
    pendingMigrationsBeforeApply: pendingPre,
    pendingMigrationsAfterApply: pendingPost,
    solePendingBeforeApply:
      pendingPre.length === 1 && pendingPre[0] === SCE_TENANT_RECORD_REFERENCE_COLUMNS_MIGRATION
        ? "YES"
        : "NO",
    preSchema,
    postSchema,
    recordReferenceSchemaReady: schemaReady(postSchema) ? "YES" : "NO",
    migrationAppliedToStage: postSchema.recordColumnsMigrationApplied ? "YES" : "NO",
    migrateStatusExcerpt: statusPost.split("\n").slice(-12).join("\n"),
    deploymentHandoff: "lib/tenant-public-reference/sce-tenant-public-reference-migration-handoff.ts",
    result:
      schemaReady(postSchema) ? "OK" : phase === "pre" && !wasAppliedBefore ? "SCHEMA_MISSING" : "INCOMPLETE",
  };

  console.log(JSON.stringify(report, null, 2));

  if (phase === "post" && apply && !schemaReady(postSchema)) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(
      "[sce-tenant-record-reference-columns-stage-migration-verify] FAILED",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });