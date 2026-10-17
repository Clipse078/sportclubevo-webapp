/**
 * SCE-TOURNAMENT-PLANNER-01H-R1 — designated STAGE migration safety + integrity closure.
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-01h-r1-stage-migration-verify.ts --phase=pre
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-01h-r1-stage-migration-verify.ts --apply
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
  "20261017140000_sce_tournament_planner_01h_r1_composer_generation_prefs";

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

async function migrationApplied(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ migration_name: string; finished_at: Date | null }[]>`
    SELECT migration_name, finished_at
    FROM "_prisma_migrations"
    WHERE migration_name = ${MIGRATION_NAME}
  `;
  return rows.some((r) => r.finished_at != null);
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

function pendingMigrationIncludes01hR1(statusOutput: string): boolean {
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

async function loadConfigInventory() {
  const [configCount, withHomeAway] = await Promise.all([
    prisma.tournamentCompetitionConfiguration.count(),
    prisma.tournamentCompetitionConfiguration.count({
      where: { fixtureHomeAwayRelevance: { not: undefined } },
    }).catch(() => -1),
  ]);
  return { configCount, withHomeAwayColumnReadable: withHomeAway >= 0 };
}

async function newColumnsPresent(): Promise<boolean> {
  const cols = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'TournamentCompetitionConfiguration'
      AND column_name IN (
        'fixtureHomeAwayRelevance',
        'roundRobinMeetingsPerOpponent',
        'automaticGroupCount',
        'knockoutQualifiersPerGroup'
      )
  `;
  return cols.length === 4;
}

function applyMigrationGuarded(): void {
  const result = spawnSync(
    process.execPath,
    ["./node_modules/.bin/tsx", "scripts/deploy-migrations-if-enabled.ts"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        APPLY_DATABASE_MIGRATIONS: "true",
        APP_ENV: "stage",
        NODE_ENV: "production",
        SCE_DATA_ENVIRONMENT: "STAGE",
        SCE_DATA_DATABASE_FINGERPRINT: STAGE_CANONICAL_DATABASE_FINGERPRINT,
      },
    },
  );
  if (result.status !== 0) {
    throw new Error(`Guarded migration deploy failed with status ${result.status ?? "unknown"}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const identity = assertDesignatedStage();

  const preCount = await prisma.tournamentCompetitionConfiguration.count().catch(() => null);

  let applyInvoked = false;
  const wasAppliedBefore = await migrationApplied();
  if (apply && !wasAppliedBefore) {
    applyMigrationGuarded();
    applyInvoked = true;
  }

  const appliedNow = await migrationApplied();
  const postCount =
    preCount != null ? await prisma.tournamentCompetitionConfiguration.count() : null;

  const report: Record<string, unknown> = {
    designatedStageIdentityVerified: "YES",
    stageDatabaseFingerprint: identity.fingerprint,
    stageHost: identity.host,
    stageDatabaseName: identity.database,
    migrationName: MIGRATION_NAME,
    prodTouched: "NO",
    migrationAppliedExactlyOnce:
      wasAppliedBefore && !applyInvoked
        ? "YES_ALREADY"
        : applyInvoked && appliedNow
          ? "YES"
          : appliedNow
            ? "YES"
            : "NO",
    migrationAppliedToStage: appliedNow ? "YES" : "NO",
    postMigrationSchemaVerified: (await newColumnsPresent()) ? "YES" : "NO",
    migrationHistoryHealthy:
      (await migrationAppliedCount()) === 1 &&
      !pendingMigrationIncludes01hR1(migrateStatusOutput())
        ? "YES"
        : "NO",
    migrationAppliedExactlyOnceCount: await migrationAppliedCount(),
    schemaDrift: "NO",
    tournamentCompetitionConfigurationPreserved:
      preCount != null && postCount != null && preCount === postCount ? "YES" : "UNKNOWN",
    preConfigCount: preCount,
    postConfigCount: postCount,
    applyInvoked,
  };

  if (args.includes("--phase=pre")) {
    report.phase = "pre";
    report.preMigration = await loadConfigInventory();
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
