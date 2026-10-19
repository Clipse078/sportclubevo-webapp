/**
 * SCE-TOURNAMENT-PLANNER-02C — designated STAGE migration safety + integrity.
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-02c-stage-migration-verify.ts
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-02c-stage-migration-verify.ts --apply
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
  "20261019140000_sce_tournament_planner_02c_participant_playing_units";

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

async function playingUnitsTablePresent(): Promise<boolean> {
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'TournamentParticipantUnit'
  `;
  return tables.length === 1;
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
  const apply = process.argv.includes("--apply");
  const identity = assertDesignatedStage();

  const participantCountBefore = await prisma.tournamentParticipant.count().catch(() => null);

  let applyInvoked = false;
  const wasAppliedBefore = await migrationApplied();
  if (apply && !wasAppliedBefore) {
    applyMigrationGuarded();
    applyInvoked = true;
  }

  const appliedNow = await migrationApplied();
  const tablePresent = await playingUnitsTablePresent();
  const participantCountAfter =
    participantCountBefore != null ? await prisma.tournamentParticipant.count() : null;

  if (tablePresent) {
    await prisma.tournamentParticipantUnit.findFirst({
      select: { id: true, displayName: true, mode: true },
    });
  }

  const report: Record<string, unknown> = {
    designatedStageIdentityVerified: "YES",
    stageDatabaseFingerprint: identity.fingerprint,
    stageHost: identity.host,
    stageDatabaseName: identity.database,
    migrationName: MIGRATION_NAME,
    prodTouched: "NO",
    migrationAppliedToStage: appliedNow ? "YES" : "NO",
    tournamentParticipantUnitTablePresent: tablePresent ? "YES" : "NO",
    prismaSelectPlayingUnitWorks: tablePresent ? "YES" : "NO",
    tournamentParticipantRowsPreserved:
      participantCountBefore != null &&
      participantCountAfter != null &&
      participantCountBefore === participantCountAfter
        ? "YES"
        : "UNKNOWN",
    preParticipantCount: participantCountBefore,
    postParticipantCount: participantCountAfter,
    applyInvoked,
    wasAppliedBefore,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!tablePresent) {
    throw new Error(
      "TournamentParticipantUnit table missing — apply migration before code that queries playing units.",
    );
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
