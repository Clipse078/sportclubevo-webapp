/**
 * SCE-ACTIVITY-CREATE-01H R1 — read-only STAGE verification for Activity Composer draft persistence.
 *
 *   APP_ENV=stage npx tsx scripts/sce-activity-create-01h-stage-migration-verify-readonly.ts
 *
 * Requires DATABASE_URL to point at shared STAGE (host fragment ep-wispy-hall-aso93dy6).
 * No schema writes.
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { resolveDeploymentIdentity } from "@/lib/server/deployment-identity";

const EXPECTED_HOST_FRAGMENT = "ep-wispy-hall-aso93dy6";
const EXPECTED_FINGERPRINT = "acd3b37682911890";

const ACTIVITY_CREATE_MIGRATIONS = [
  "20261013143000_sce_activity_create_01c_club_event",
  "20261013180000_sce_activity_create_01d_training",
  "20261013210000_sce_club_admin_club_event_approve_backfill",
  "20261014120000_sce_activity_create_01e_match",
  "20261014130000_sce_activity_create_01f_tournament",
] as const;

const COMPOSER_DRAFT_TABLES = [
  "ClubEventComposerDraft",
  "TrainingComposerDraft",
  "MatchComposerDraft",
  "TournamentComposerDraft",
] as const;

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

async function main(): Promise<void> {
  const identity = resolveDeploymentIdentity(process.env);
  const hostOk = Boolean(identity.databaseHost?.includes(EXPECTED_HOST_FRAGMENT));
  const fingerprintOk = identity.databaseFingerprint === EXPECTED_FINGERPRINT;

  const migrationRows = await prisma.$queryRaw<
    Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>
  >`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name = ANY(${ACTIVITY_CREATE_MIGRATIONS})
    ORDER BY migration_name
  `;

  const failedRows = await prisma.$queryRaw<
    Array<{ migration_name: string; finished_at: Date | null; logs: string | null }>
  >`
    SELECT migration_name, finished_at, logs
    FROM "_prisma_migrations"
    WHERE finished_at IS NULL AND rolled_back_at IS NULL
      AND migration_name LIKE '%activity_create%'
  `;

  const draftTables: Record<string, boolean> = {};
  for (const table of COMPOSER_DRAFT_TABLES) {
    draftTables[table] = await tableExists(table);
  }

  const trainingApprovePerm = await prisma.$queryRaw<
    Array<{ key: string; module: string }>
  >`
    SELECT "key", "module"::text AS module
    FROM "Permission"
    WHERE "key" = 'activities.training.approve'
  `;

  const applied = new Set(
    migrationRows.filter((row) => row.finished_at != null).map((row) => row.migration_name),
  );
  const pendingFromRepo = ACTIVITY_CREATE_MIGRATIONS.filter((name) => !applied.has(name));

  console.log(
    JSON.stringify(
      {
        databaseIdentity: {
          hostFragmentMatch: hostOk,
          fingerprint: identity.databaseFingerprint,
          fingerprintMatch: fingerprintOk,
        },
        activityCreateMigrations: {
          expected: ACTIVITY_CREATE_MIGRATIONS,
          recorded: migrationRows,
          pendingByAppliedRows: pendingFromRepo,
          failedIncompleteRows: failedRows,
        },
        composerDraftTables: draftTables,
        trainingApprovePermission: trainingApprovePerm[0] ?? null,
        schemaHealthy:
          hostOk &&
          fingerprintOk &&
          failedRows.length === 0 &&
          pendingFromRepo.length === 0 &&
          COMPOSER_DRAFT_TABLES.every((table) => draftTables[table]),
        writePerformed: false,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().catch(() => undefined));
