/**
 * SCE-CD-04R2 — designated STAGE migration safety for sprint lifecycle history (migration 3 only).
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-cd-04r2-stage-migration-verify.ts --phase=pre
 *
 * Apply migration 3 only (prisma migrate deploy; no post-deploy Club Admin reconciliation):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     APPLY_DATABASE_MIGRATIONS=true DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-cd-04r2-stage-migration-verify.ts --apply
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

const MIGRATION_1 = "20261113183000_sce_cd_04_strategy_sprints";
const MIGRATION_2 = "20261114103000_sce_cd_04_task_primary_initiative";
export const MIGRATION_3 = "20261114180000_sce_cd_04r2_sprint_lifecycle_history";

const AUTHORIZED_PENDING = new Set([MIGRATION_3]);

const MIGRATION_SQL_PATH = resolve(
  process.cwd(),
  `prisma/migrations/${MIGRATION_3}/migration.sql`,
);

type Cd04R2SchemaSnapshot = {
  developmentSprintGoalResultEnum: boolean;
  developmentSprintStartedAt: boolean;
  developmentSprintGoalResult: boolean;
  developmentSprintReviewNotes: boolean;
  developmentSprintCloseSnapshot: boolean;
  membershipCommittedAtSprintStart: boolean;
  appliedMigration1: boolean;
  appliedMigration2: boolean;
  appliedMigration3: boolean;
  migration3Checksum: string | null;
  migration3FinishedAt: string | null;
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
  if (database !== "neondb") {
    throw new Error(`Expected database neondb, got ${database}.`);
  }
  return { fingerprint, host, database };
}

async function loadCd04R2SchemaSnapshot(): Promise<Cd04R2SchemaSnapshot> {
  const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'DevelopmentSprintGoalResult'
  `;

  const sprintColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DevelopmentSprint'
      AND column_name IN ('startedAt', 'goalResult', 'reviewNotes', 'closeSnapshot')
  `;
  const sprintColumnNames = new Set(sprintColumns.map((row) => row.column_name));

  const membershipColumn = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DevelopmentSprintTaskMembership'
      AND column_name = 'committedAtSprintStart'
  `;

  const migrations = await prisma.$queryRaw<
    Array<{ migration_name: string; finished_at: Date | null; checksum: string }>
  >`
    SELECT migration_name, finished_at, checksum
    FROM "_prisma_migrations"
    WHERE migration_name IN (${MIGRATION_1}, ${MIGRATION_2}, ${MIGRATION_3})
  `;
  const byName = new Map(migrations.map((row) => [row.migration_name, row]));
  const m3 = byName.get(MIGRATION_3);

  return {
    developmentSprintGoalResultEnum: enums.length > 0,
    developmentSprintStartedAt: sprintColumnNames.has("startedAt"),
    developmentSprintGoalResult: sprintColumnNames.has("goalResult"),
    developmentSprintReviewNotes: sprintColumnNames.has("reviewNotes"),
    developmentSprintCloseSnapshot: sprintColumnNames.has("closeSnapshot"),
    membershipCommittedAtSprintStart: membershipColumn.length > 0,
    appliedMigration1: byName.get(MIGRATION_1)?.finished_at != null,
    appliedMigration2: byName.get(MIGRATION_2)?.finished_at != null,
    appliedMigration3: m3?.finished_at != null,
    migration3Checksum: m3?.checksum ?? null,
    migration3FinishedAt: m3?.finished_at?.toISOString() ?? null,
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
  const marker = "The migrations have not yet been applied:";
  const stopMarker = "The migrations from the database are not found locally";
  const idx = statusOutput.indexOf(marker);
  if (idx === -1) return pending;
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

function schemaReady(snapshot: Cd04R2SchemaSnapshot): boolean {
  return (
    snapshot.developmentSprintGoalResultEnum &&
    snapshot.developmentSprintStartedAt &&
    snapshot.developmentSprintGoalResult &&
    snapshot.developmentSprintReviewNotes &&
    snapshot.developmentSprintCloseSnapshot &&
    snapshot.membershipCommittedAtSprintStart &&
    snapshot.appliedMigration1 &&
    snapshot.appliedMigration2 &&
    snapshot.appliedMigration3
  );
}

function applyMigrationGuarded(): void {
  assertPendingOnlyAuthorized(migrateStatusOutput());
  const databaseUrl =
    process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  assertOperationalMutationAllowed(
    {
      operationId: "sce-cd-04r2-stage-migration",
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
  const preSchema = await loadCd04R2SchemaSnapshot();
  const statusPre = migrateStatusOutput();
  const pendingPre = parsePendingMigrationNames(statusPre);
  const wasAppliedBefore = preSchema.appliedMigration3;
  const localSqlChecksum = migrationSqlSha256();

  let applyInvoked = false;
  if (apply && !wasAppliedBefore) {
    if (!preSchema.appliedMigration1 || !preSchema.appliedMigration2) {
      throw new Error(
        "Prerequisite CD-04 migrations 1–2 must already be applied on STAGE before migration 3.",
      );
    }
    applyMigrationGuarded();
    applyInvoked = true;
  }

  const postSchema = await loadCd04R2SchemaSnapshot();
  const statusPost = migrateStatusOutput();
  const pendingPost = parsePendingMigrationNames(statusPost);

  const report: Record<string, unknown> = {
    designatedStageIdentityVerified: "YES",
    appEnvVerified: "stage",
    sceDataEnvironmentVerified: "STAGE",
    databaseFingerprintVerified: identity.fingerprint,
    stageHostFragment: "ep-wispy-hall-aso93dy6",
    stageDatabaseName: identity.database,
    authorizedMigrationOnly: MIGRATION_3,
    localMigrationSqlSha256: localSqlChecksum,
    prodTouched: "NO",
    sharedDataBackfill: "NO",
    postDeployClubAdminReconciliation: "SKIPPED_BY_AUTHORIZATION_SCOPE",
    phase,
    applyInvoked,
    pendingMigrationsBeforeApply: pendingPre,
    pendingMigrationsAfterApply: pendingPost,
    preSchema,
    postSchema,
    cd04R2SchemaReady: schemaReady(postSchema) ? "YES" : "NO",
    migrationAppliedToStage: postSchema.appliedMigration3 ? "YES" : "NO",
    migrateStatusExcerpt: statusPost.split("\n").slice(-10).join("\n"),
    recoveryNote:
      "On failure: do not auto-rollback. See docs/planning/SCE-CD-04-MIGRATION-PROPOSAL.md.",
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
    console.error("[sce-cd-04r2-stage-migration-verify] FAILED", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });