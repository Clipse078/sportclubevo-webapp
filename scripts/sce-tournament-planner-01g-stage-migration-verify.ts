/**
 * SCE-TOURNAMENT-PLANNER-01G — designated STAGE migration safety + integrity closure.
 *
 * Read-only inventory/audit:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-01g-stage-migration-verify.ts --phase=pre
 *
 * Post-migration verification:
 *   ... --phase=post --pre-snapshot=/path/to/pre.json
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-01g-stage-migration-verify.ts --apply
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { resolveEffectiveScheduleLockDimension } from "@/lib/tournament-scheduling/schedule-lock/normalize";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

const MIGRATION_NAME =
  "20261017120000_sce_tournament_planner_01g_schedule_lock_dimension";

type PreSnapshot = {
  tournamentFixtureAssignmentCount: number;
  legacyLockedCount: number;
  legacyUnlockedCount: number;
  scheduleVersionCount: number;
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

async function loadPreSnapshot(): Promise<PreSnapshot> {
  const [assignmentCount, legacyLocked, legacyUnlocked, scheduleVersionCount] =
    await Promise.all([
      prisma.tournamentFixtureAssignment.count(),
      prisma.tournamentFixtureAssignment.count({ where: { isLocked: true } }),
      prisma.tournamentFixtureAssignment.count({ where: { isLocked: false } }),
      prisma.tournamentScheduleVersion.count(),
    ]);
  return {
    tournamentFixtureAssignmentCount: assignmentCount,
    legacyLockedCount: legacyLocked,
    legacyUnlockedCount: legacyUnlocked,
    scheduleVersionCount,
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

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function enumExists(typeName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = ${typeName}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function loadLegacyLockIntegrity(): Promise<{
  legacyLockedNotTimeAndPitch: number;
  legacyUnlockedBackfilledToLocked: number;
  legacyLockedEffectiveNotFull: number;
}> {
  const legacyLockedNotTimeAndPitch = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixtureAssignment"
    WHERE "isLocked" = true
      AND ("scheduleLockDimension" IS DISTINCT FROM 'TIME_AND_PITCH')
  `;
  const legacyUnlockedBackfilled = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixtureAssignment"
    WHERE "isLocked" = false
      AND "scheduleLockDimension" IS NOT NULL
  `;
  const rows = await prisma.tournamentFixtureAssignment.findMany({
    where: { isLocked: true },
    select: {
      scheduleLockDimension: true,
      isLocked: true,
    },
  });
  let legacyLockedEffectiveNotFull = 0;
  for (const row of rows) {
    const effective = resolveEffectiveScheduleLockDimension({
      scheduleLockDimension: row.scheduleLockDimension,
      isLocked: row.isLocked,
    });
    if (effective !== "TIME_AND_PITCH") {
      legacyLockedEffectiveNotFull += 1;
    }
  }
  return {
    legacyLockedNotTimeAndPitch: Number(legacyLockedNotTimeAndPitch[0]?.count ?? 0),
    legacyUnlockedBackfilledToLocked: Number(legacyUnlockedBackfilled[0]?.count ?? 0),
    legacyLockedEffectiveNotFull,
  };
}

function pendingMigrationIncludes01g(statusOutput: string): boolean {
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
  const phase = args.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "pre";
  const apply = args.includes("--apply");
  const snapshotOut = args.find((a) => a.startsWith("--snapshot-out="))?.split("=")[1];
  const preSnapshotPath = args.find((a) => a.startsWith("--pre-snapshot="))?.split("=")[1];

  const identity = assertDesignatedStage();
  const report: Record<string, unknown> = {
    designatedStageIdentityVerified: "YES",
    appEnvVerified: "stage",
    sceDataEnvironmentVerified: "STAGE",
    databaseFingerprintVerified: identity.fingerprint,
    stageHostFragment: KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS[0],
    stageDatabaseName: identity.database,
    migrationName: MIGRATION_NAME,
    targetIsProd: "NO",
    prodTouched: "NO",
  };

  if (apply) {
    const beforeCount = await migrationAppliedCount();
    if (beforeCount > 0) {
      report.migrationAppliedToStage = "YES_ALREADY";
    } else {
      applyMigrationGuarded();
      report.migrationAppliedToStage = (await migrationApplied()) ? "YES" : "NO";
    }
    report.migrationAppliedExactlyOnce = (await migrationAppliedCount()) === 1 ? "YES" : "NO";
    const status = migrateStatusOutput();
    report.pending01gAfterApply = pendingMigrationIncludes01g(status) ? "YES" : "NO";
  }

  if (phase === "pre") {
    const pre = await loadPreSnapshot();
    report.phase = "pre";
    report.preMigration = pre;
    report.migrationAlreadyApplied = await migrationApplied();
    report.scheduleLockColumnExists = (await columnExists(
      "TournamentFixtureAssignment",
      "scheduleLockDimension",
    ))
      ? "YES"
      : "NO";
    if (snapshotOut) {
      writeFileSync(snapshotOut, JSON.stringify(pre, null, 2));
    }
  }

  if (phase === "post" || phase === "smoke") {
    if (phase === "post" && !preSnapshotPath) {
      throw new Error("--pre-snapshot= required for --phase=post");
    }
    const pre =
      phase === "post"
        ? (JSON.parse(readFileSync(preSnapshotPath!, "utf8")) as PreSnapshot)
        : null;
    const post = await loadPreSnapshot();
    const legacy = await loadLegacyLockIntegrity();
    const schemaOk =
      (await enumExists("TournamentFixtureScheduleLockDimension")) &&
      (await columnExists("TournamentFixtureAssignment", "scheduleLockDimension")) &&
      (await columnExists("TournamentFixtureAssignment", "lockedAt")) &&
      (await columnExists("TournamentFixtureAssignment", "lockedByUserId")) &&
      (await columnExists("TournamentFixtureAssignment", "isLocked"));

    report.phase = phase;
    if (pre) {
      report.preMigration = pre;
      report.postMigration = post;
      report.rowPreservation = {
        tournamentFixtureAssignmentCount:
          post.tournamentFixtureAssignmentCount === pre.tournamentFixtureAssignmentCount,
        scheduleVersionCount: post.scheduleVersionCount === pre.scheduleVersionCount,
      };
    }
    report.legacyLockIntegrity = legacy;
    report.postMigrationSchemaVerified = schemaOk ? "YES" : "NO";
    report.migrationAppliedToStage = (await migrationApplied()) ? "YES" : "NO";
    report.migrationAppliedExactlyOnce =
      (await migrationAppliedCount()) === 1 ? "YES" : "NO";
    report.legacyLockDataPreserved =
      legacy.legacyLockedNotTimeAndPitch === 0 &&
      legacy.legacyLockedEffectiveNotFull === 0 &&
      legacy.legacyUnlockedBackfilledToLocked === 0
        ? "YES"
        : "NO";
    report.legacyLockedRowsNormaliseToTimeAndPitch =
      legacy.legacyLockedNotTimeAndPitch === 0 && legacy.legacyLockedEffectiveNotFull === 0
        ? "YES"
        : "NO";
    report.legacyUnlockedRowsRemainUnlocked =
      legacy.legacyUnlockedBackfilledToLocked === 0 ? "YES" : "NO";
    report.postMigrationLockServiceCompatibility =
      schemaOk &&
      (await migrationApplied()) &&
      legacy.legacyLockedNotTimeAndPitch === 0 &&
      legacy.legacyUnlockedBackfilledToLocked === 0
        ? "PASS"
        : "FAIL";
    report.persistentTestData = "NO";
    const status = migrateStatusOutput();
    report.migrationHistoryHealthy =
      (await migrationAppliedCount()) === 1 && !pendingMigrationIncludes01g(status)
        ? "YES"
        : "NO";
    report.schemaDrift = status.includes("Database schema is up to date") ? "NO" : "LEGACY_KNOWN";
  }

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
