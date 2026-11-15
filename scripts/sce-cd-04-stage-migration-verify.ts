/**
 * SCE-CD-04 — designated STAGE migration safety + schema parity (strategy/sprints + primary initiative).
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-cd-04-stage-migration-verify.ts --phase=pre
 *
 * Apply migrations (guarded deploy only; pending list must be exclusively CD-04):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-cd-04-stage-migration-verify.ts --apply
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

const MIGRATION_1 = "20261113183000_sce_cd_04_strategy_sprints";
const MIGRATION_2 = "20261114103000_sce_cd_04_task_primary_initiative";

const AUTHORIZED_PENDING = new Set([MIGRATION_1, MIGRATION_2]);

type RowSnapshot = {
  initiativeCount: number;
  taskCount: number;
  targetCount: number;
  initiativeTargetLinkCount: number;
};

type Cd04SchemaSnapshot = {
  initiativeDispositionEnum: boolean;
  developmentSprintStatusEnum: boolean;
  initiativeMilestoneStatusEnum: boolean;
  initiativeMilestoneTable: boolean;
  initiativeTargetLinkTable: boolean;
  developmentSprintTable: boolean;
  developmentSprintTaskMembershipTable: boolean;
  taskPrimaryInitiativeColumn: boolean;
  taskPrimaryInitiativeIndex: boolean;
  developmentSprintSlugUnique: boolean;
  initiativeTargetLinkUnique: boolean;
  appliedMigration1: boolean;
  appliedMigration2: boolean;
  migration1Checksum: string | null;
  migration2Checksum: string | null;
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

async function loadRowSnapshot(): Promise<RowSnapshot> {
  const [initiativeCount, taskCount, targetCount] = await Promise.all([
    prisma.initiative.count(),
    prisma.task.count(),
    prisma.target.count(),
  ]);
  const linkTable = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'InitiativeTargetLink'
    ) AS exists
  `;
  let initiativeTargetLinkCount = 0;
  if (linkTable[0]?.exists) {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "InitiativeTargetLink"
    `;
    initiativeTargetLinkCount = Number(rows[0]?.count ?? 0);
  }
  return { initiativeCount, taskCount, targetCount, initiativeTargetLinkCount };
}

async function loadCd04SchemaSnapshot(): Promise<Cd04SchemaSnapshot> {
  const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname IN (
        'InitiativeDisposition',
        'DevelopmentSprintStatus',
        'InitiativeMilestoneStatus'
      )
  `;
  const enumNames = new Set(enums.map((row) => row.typname));

  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'InitiativeMilestone',
        'InitiativeTargetLink',
        'DevelopmentSprint',
        'DevelopmentSprintTaskMembership'
      )
  `;
  const tableNames = new Set(tables.map((row) => row.table_name));

  const taskColumn = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Task'
      AND column_name = 'primaryInitiativeId'
  `;

  const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'DevelopmentSprint_tenantId_slug_key',
        'InitiativeTargetLink_initiativeId_targetId_key',
        'Task_tenantId_primaryInitiativeId_idx'
      )
  `;
  const indexNames = new Set(indexes.map((row) => row.indexname));

  const migrations = await prisma.$queryRaw<
    Array<{ migration_name: string; finished_at: Date | null; checksum: string }>
  >`
    SELECT migration_name, finished_at, checksum
    FROM "_prisma_migrations"
    WHERE migration_name IN (${MIGRATION_1}, ${MIGRATION_2})
  `;
  const byName = new Map(migrations.map((row) => [row.migration_name, row]));

  return {
    initiativeDispositionEnum: enumNames.has("InitiativeDisposition"),
    developmentSprintStatusEnum: enumNames.has("DevelopmentSprintStatus"),
    initiativeMilestoneStatusEnum: enumNames.has("InitiativeMilestoneStatus"),
    initiativeMilestoneTable: tableNames.has("InitiativeMilestone"),
    initiativeTargetLinkTable: tableNames.has("InitiativeTargetLink"),
    developmentSprintTable: tableNames.has("DevelopmentSprint"),
    developmentSprintTaskMembershipTable: tableNames.has("DevelopmentSprintTaskMembership"),
    taskPrimaryInitiativeColumn: taskColumn.length > 0,
    taskPrimaryInitiativeIndex: indexNames.has("Task_tenantId_primaryInitiativeId_idx"),
    developmentSprintSlugUnique: indexNames.has("DevelopmentSprint_tenantId_slug_key"),
    initiativeTargetLinkUnique: indexNames.has("InitiativeTargetLink_initiativeId_targetId_key"),
    appliedMigration1: byName.get(MIGRATION_1)?.finished_at != null,
    appliedMigration2: byName.get(MIGRATION_2)?.finished_at != null,
    migration1Checksum: byName.get(MIGRATION_1)?.checksum ?? null,
    migration2Checksum: byName.get(MIGRATION_2)?.checksum ?? null,
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
    if (!trimmed) continue;
    pending.push(trimmed);
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
}

function schemaReady(snapshot: Cd04SchemaSnapshot): boolean {
  return (
    snapshot.initiativeDispositionEnum &&
    snapshot.developmentSprintStatusEnum &&
    snapshot.initiativeMilestoneStatusEnum &&
    snapshot.initiativeMilestoneTable &&
    snapshot.initiativeTargetLinkTable &&
    snapshot.developmentSprintTable &&
    snapshot.developmentSprintTaskMembershipTable &&
    snapshot.taskPrimaryInitiativeColumn &&
    snapshot.taskPrimaryInitiativeIndex &&
    snapshot.developmentSprintSlugUnique &&
    snapshot.initiativeTargetLinkUnique &&
    snapshot.appliedMigration1 &&
    snapshot.appliedMigration2
  );
}

function applyMigrationGuarded(): void {
  assertPendingOnlyAuthorized(migrateStatusOutput());
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
  const preRows = await loadRowSnapshot();
  const preSchema = await loadCd04SchemaSnapshot();
  const statusPre = migrateStatusOutput();
  const pendingPre = parsePendingMigrationNames(statusPre);
  const wasAppliedBefore = preSchema.appliedMigration1 && preSchema.appliedMigration2;

  let applyInvoked = false;
  if (apply && !wasAppliedBefore) {
    applyMigrationGuarded();
    applyInvoked = true;
  }

  const postRows = await loadRowSnapshot();
  const postSchema = await loadCd04SchemaSnapshot();
  const statusPost = migrateStatusOutput();
  const pendingPost = parsePendingMigrationNames(statusPost);

  const report: Record<string, unknown> = {
    designatedStageIdentityVerified: "YES",
    appEnvVerified: "stage",
    sceDataEnvironmentVerified: "STAGE",
    databaseFingerprintVerified: identity.fingerprint,
    stageHostFragment: "ep-wispy-hall-aso93dy6",
    stageDatabaseName: identity.database,
    authorizedMigrations: [MIGRATION_1, MIGRATION_2],
    prodTouched: "NO",
    sharedDataBackfill: "NO",
    phase,
    applyInvoked,
    pendingMigrationsBeforeApply: pendingPre,
    pendingMigrationsAfterApply: pendingPost,
    preMigrationRowCounts: preRows,
    postMigrationRowCounts: postRows,
    existingInitiativeRowsPreserved:
      preRows.initiativeCount === postRows.initiativeCount ? "YES" : "NO",
    existingTaskRowsPreserved: preRows.taskCount === postRows.taskCount ? "YES" : "NO",
    existingTargetRowsPreserved: preRows.targetCount === postRows.targetCount ? "YES" : "NO",
    preSchema: preSchema,
    postSchema: postSchema,
    cd04SchemaReady: schemaReady(postSchema) ? "YES" : "NO",
    migrationAppliedToStage:
      postSchema.appliedMigration1 && postSchema.appliedMigration2 ? "YES" : "NO",
    migrateStatusExcerpt: statusPost.split("\n").slice(-8).join("\n"),
    legacyLinkedInitiativeRefsBackfill: "NOT_PERFORMED",
    compatibilityNote:
      "Target.linkedInitiativeRefs JSON remains authoritative for legacy links; InitiativeTargetLink is additive; strategy-overview merges both.",
    recoveryNote:
      "On failure: do not auto-rollback. Use SCE-CD-04-MIGRATION-PROPOSAL.md rollback section and STAGE recovery runbook.",
    result: schemaReady(postSchema) ? "OK" : phase === "pre" && !wasAppliedBefore ? "SCHEMA_MISSING" : "INCOMPLETE",
  };

  console.log(JSON.stringify(report, null, 2));

  if (phase === "post" && !schemaReady(postSchema)) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("[sce-cd-04-stage-migration-verify] FAILED", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });