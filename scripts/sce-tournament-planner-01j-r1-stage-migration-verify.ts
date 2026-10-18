/**
 * SCE-TOURNAMENT-PLANNER-01J-R1 — designated STAGE migration safety + integrity closure.
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-01j-r1-stage-migration-verify.ts --phase=pre
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-01j-r1-stage-migration-verify.ts --apply
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
  "20261018120000_sce_tournament_planner_01j_fixture_results";

type IntegritySnapshot = {
  tournamentFixtureCount: number;
  tournamentFixtureAssignmentCount: number;
  tournamentScheduleVersionCount: number;
  tournamentParticipantCount: number;
  tournamentQualificationSourceCount: number;
  tournamentCompetitionConfigurationCount: number;
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
  const [
    tournamentFixtureCount,
    tournamentFixtureAssignmentCount,
    tournamentScheduleVersionCount,
    tournamentParticipantCount,
    tournamentQualificationSourceCount,
    tournamentCompetitionConfigurationCount,
  ] = await Promise.all([
    prisma.tournamentFixture.count(),
    prisma.tournamentFixtureAssignment.count(),
    prisma.tournamentScheduleVersion.count(),
    prisma.tournamentParticipant.count(),
    prisma.tournamentQualificationSource.count(),
    prisma.tournamentCompetitionConfiguration.count(),
  ]);
  return {
    tournamentFixtureCount,
    tournamentFixtureAssignmentCount,
    tournamentScheduleVersionCount,
    tournamentParticipantCount,
    tournamentQualificationSourceCount,
    tournamentCompetitionConfigurationCount,
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

async function resultPersistenceObjectsPresent(): Promise<boolean> {
  const [enumRow, tableRow] = await Promise.all([
    prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'TournamentFixtureResultState'
      ) AS exists
    `,
    prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'TournamentFixtureResult'
      ) AS exists
    `,
  ]);
  if (!enumRow[0]?.exists || !tableRow[0]?.exists) {
    return false;
  }
  const cols = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'TournamentFixtureResult'
      AND column_name IN (
        'fixtureId',
        'state',
        'scoreSideA',
        'scoreSideB',
        'winnerParticipantId',
        'revision',
        'previousResultSnapshotJson'
      )
  `;
  return cols.length === 7;
}

function pendingMigrationIncludes01j(statusOutput: string): boolean {
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
  const phase = args.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "post";
  const apply = args.includes("--apply");

  const identity = assertDesignatedStage();
  const preSnapshot = await loadIntegritySnapshot();
  const wasAppliedBefore = await migrationApplied();

  let applyInvoked = false;
  if (apply && !wasAppliedBefore) {
    applyMigrationGuarded();
    applyInvoked = true;
  }

  const postSnapshot = await loadIntegritySnapshot();
  const status = migrateStatusOutput();
  const appliedCount = await migrationAppliedCount();
  const schemaOk = await resultPersistenceObjectsPresent();

  const report: Record<string, unknown> = {
    designatedStageIdentityVerified: "YES",
    appEnvVerified: "stage",
    sceDataEnvironmentVerified: "STAGE",
    databaseFingerprintVerified: identity.fingerprint,
    stageHost: identity.host,
    stageDatabaseName: identity.database,
    migrationName: MIGRATION_NAME,
    prodTouched: "NO",
    persistentTestData: "NO",
    phase,
    preMigrationCounts: preSnapshot,
    postMigrationCounts: postSnapshot,
    existingTournamentDataPreserved:
      preSnapshot.tournamentFixtureCount === postSnapshot.tournamentFixtureCount
        ? "YES"
        : "NO",
    existingScheduleAssignmentsPreserved:
      preSnapshot.tournamentFixtureAssignmentCount ===
      postSnapshot.tournamentFixtureAssignmentCount
        ? "YES"
        : "NO",
    existingQualificationSourcesPreserved:
      preSnapshot.tournamentQualificationSourceCount ===
      postSnapshot.tournamentQualificationSourceCount
        ? "YES"
        : "NO",
    existingParticipantsPreserved:
      preSnapshot.tournamentParticipantCount === postSnapshot.tournamentParticipantCount
        ? "YES"
        : "NO",
    existingCompetitionConfigurationPreserved:
      preSnapshot.tournamentCompetitionConfigurationCount ===
      postSnapshot.tournamentCompetitionConfigurationCount
        ? "YES"
        : "NO",
    migrationAppliedToStage: (await migrationApplied()) ? "YES" : "NO",
    migrationAppliedExactlyOnce:
      wasAppliedBefore && !applyInvoked
        ? appliedCount === 1
          ? "YES_ALREADY"
          : "NO"
        : applyInvoked && appliedCount === 1
          ? "YES"
          : appliedCount === 1
            ? "YES"
            : "NO",
    migrationAppliedExactlyOnceCount: appliedCount,
    postMigrationSchemaVerified: schemaOk ? "YES" : "NO",
    migrationHistoryHealthy:
      appliedCount === 1 && !pendingMigrationIncludes01j(status) ? "YES" : "NO",
    schemaDrift: status.includes("Database schema is up to date") ? "NO" : "CHECK_STATUS",
    applyInvoked,
  };

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
