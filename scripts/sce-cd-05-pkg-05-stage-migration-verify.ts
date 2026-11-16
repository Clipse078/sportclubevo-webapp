/**
 * SCE-CD-05 PKG-05 — designated STAGE migration safety (club strategy authoring only).
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     npx tsx scripts/sce-cd-05-pkg-05-stage-migration-verify.ts --phase=pre
 *
 * Apply migration only (prisma migrate deploy; no post-deploy Club Admin reconciliation):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     APPLY_DATABASE_MIGRATIONS=true DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     npx tsx scripts/sce-cd-05-pkg-05-stage-migration-verify.ts --apply
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
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { resolvePrismaCliPath } from "@/lib/server/prisma-cli";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

export const MIGRATION_PKG_05 = "20261115150000_sce_cd_05_club_strategy_authoring";

const AUTHORIZED_PENDING = new Set([MIGRATION_PKG_05]);

const MIGRATION_SQL_PATH = resolve(
  process.cwd(),
  `prisma/migrations/${MIGRATION_PKG_05}/migration.sql`,
);

type Pkg05SchemaSnapshot = {
  clubStrategyTable: boolean;
  clubStrategyDocumentKindEnum: boolean;
  clubStrategyFocusTargetTable: boolean;
  clubStrategyDocumentReferenceTable: boolean;
  appliedMigration: boolean;
  migrationChecksum: string | null;
  migrationFinishedAt: string | null;
  clubStrategyRowCount: number;
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

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

async function enumExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = ${name}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

async function loadPkg05SchemaSnapshot(): Promise<Pkg05SchemaSnapshot> {
  const applied = await prisma.$queryRaw<
    Array<{ checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>
  >`
    SELECT checksum, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name = ${MIGRATION_PKG_05}
    LIMIT 1
  `;
  const row = applied.find((r) => r.finished_at && !r.rolled_back_at);
  const clubStrategyTable = await tableExists("ClubStrategy");
  const clubStrategyRowCount = clubStrategyTable
    ? Number(
        (
          await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*)::bigint AS count FROM "ClubStrategy"
          `
        )[0]?.count ?? 0,
      )
    : 0;

  return {
    clubStrategyTable,
    clubStrategyDocumentKindEnum: await enumExists("ClubStrategyDocumentKind"),
    clubStrategyFocusTargetTable: await tableExists("ClubStrategyFocusTarget"),
    clubStrategyDocumentReferenceTable: await tableExists("ClubStrategyDocumentReference"),
    appliedMigration: Boolean(row),
    migrationChecksum: row?.checksum ?? null,
    migrationFinishedAt: row?.finished_at?.toISOString?.() ?? null,
    clubStrategyRowCount,
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
}

function schemaReady(snapshot: Pkg05SchemaSnapshot): boolean {
  return (
    snapshot.clubStrategyTable &&
    snapshot.clubStrategyDocumentKindEnum &&
    snapshot.clubStrategyFocusTargetTable &&
    snapshot.clubStrategyDocumentReferenceTable &&
    snapshot.appliedMigration
  );
}

function applyMigrationGuarded(): void {
  assertPendingOnlyAuthorized(migrateStatusOutput());
  const databaseUrl =
    process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  assertOperationalMutationAllowed(
    {
      operationId: "sce-cd-05-pkg-05-stage-migration",
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
  const preSchema = await loadPkg05SchemaSnapshot();
  const statusPre = migrateStatusOutput();
  const pendingPre = parsePendingMigrationNames(statusPre);
  const wasAppliedBefore = preSchema.appliedMigration;
  const localSqlChecksum = migrationSqlSha256();

  let applyInvoked = false;
  if (apply && !wasAppliedBefore) {
    applyMigrationGuarded();
    applyInvoked = true;
  }

  const postSchema = await loadPkg05SchemaSnapshot();
  const statusPost = migrateStatusOutput();
  const pendingPost = parsePendingMigrationNames(statusPost);

  const report: Record<string, unknown> = {
    designatedStageIdentityVerified: "YES",
    appEnvVerified: "stage",
    sceDataEnvironmentVerified: "STAGE",
    databaseFingerprintVerified: identity.fingerprint,
    stageHostFragment: "ep-wispy-hall-aso93dy6",
    stageDatabaseName: identity.database,
    authorizedMigrationOnly: MIGRATION_PKG_05,
    localMigrationSqlSha256: localSqlChecksum,
    prodTouched: "NO",
    sharedDataBackfill: "NO",
    postDeployClubAdminReconciliation: "SKIPPED_BY_AUTHORIZATION_SCOPE",
    coupledFullDeployNote:
      "npm run db:migrate:deploy-if-enabled also runs scripts/post-deploy-tenant-club-admin-reconciliation.ts; this --apply path does not.",
    phase,
    applyInvoked,
    pendingMigrationsBeforeApply: pendingPre,
    pendingMigrationsAfterApply: pendingPost,
    preSchema,
    postSchema,
    pkg05SchemaReady: schemaReady(postSchema) ? "YES" : "NO",
    migrationAppliedToStage: postSchema.appliedMigration ? "YES" : "NO",
    migrateStatusExcerpt: statusPost.split("\n").slice(-10).join("\n"),
    recoveryNote:
      "On failure: additive forward-fix only. See docs/planning/SCE-CD-05-PKG-05-MIGRATION-HANDOFF.md.",
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
      "[sce-cd-05-pkg-05-stage-migration-verify] FAILED",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });