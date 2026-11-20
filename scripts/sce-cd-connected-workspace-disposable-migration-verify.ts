/**
 * PR #1017 — disposable Postgres migration replay (never STAGE / production).
 *
 *   TEST_DATABASE_URL=postgresql://…/sce_cd_connected_migration_test \
 *     npm run cd-connected:disposable-migration-verify
 *
 * Applies repo migrations only when every Prisma endpoint matches TEST_DATABASE_URL.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { CONNECTED_WORKSPACE_PO_UAT_HANDOFF } from "@/lib/club-development/sce-cd-connected-workspace-po-uat-handoff";
import {
  buildDisposablePrismaMigrateProcessEnv,
  collectPrismaMigrationEndpointReport,
} from "@/lib/test/safe-disposable-migration-env";
import { maskDatabaseUrl } from "@/lib/test/safe-test-database";

const MIGRATIONS = [
  CONNECTED_WORKSPACE_PO_UAT_HANDOFF.requiredMigration,
  CONNECTED_WORKSPACE_PO_UAT_HANDOFF.orgUnitAssignmentMigration,
] as const;

function migrationChecksum(name: string): string {
  const sqlPath = path.join(process.cwd(), `prisma/migrations/${name}/migration.sql`);
  return crypto.createHash("sha256").update(fs.readFileSync(sqlPath)).digest("hex");
}

async function loadAppliedMigrations(connectionString: string) {
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    return await prisma.$queryRaw<
      Array<{ migration_name: string; checksum: string; finished_at: Date | null }>
    >`
      SELECT migration_name, checksum, finished_at
      FROM "_prisma_migrations"
      WHERE migration_name IN (${MIGRATIONS[0]}, ${MIGRATIONS[1]})
        AND finished_at IS NOT NULL
        AND rolled_back_at IS NULL
    `;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main(): Promise<void> {
  const endpointsBefore = collectPrismaMigrationEndpointReport(process.env);
  const migrateEnv = buildDisposablePrismaMigrateProcessEnv(process.env);

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: migrateEnv,
  });

  const connectionString = migrateEnv.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("Disposable DATABASE_URL missing after guard.");
  }

  const applied = await loadAppliedMigrations(connectionString);
  const repoChecksums = Object.fromEntries(MIGRATIONS.map((m) => [m, migrationChecksum(m)]));

  const migrationReport = MIGRATIONS.map((name) => {
    const row = applied.find((r) => r.migration_name === name);
    return {
      name,
      applied: Boolean(row),
      checksumInDb: row?.checksum ?? null,
      repoChecksum: repoChecksums[name],
      checksumMatch: row?.checksum === repoChecksums[name],
      finishedAt: row?.finished_at?.toISOString?.() ?? null,
    };
  });

  console.log(
    JSON.stringify(
      {
        pullRequest: CONNECTED_WORKSPACE_PO_UAT_HANDOFF,
        writePerformed: true,
        disposableTarget: maskDatabaseUrl(connectionString),
        endpointsBeforeGuard: endpointsBefore,
        endpointsAfterGuard: collectPrismaMigrationEndpointReport(migrateEnv),
        migrationReport,
        note: "Replayed on disposable Postgres only; shared STAGE was not targeted.",
      },
      null,
      2,
    ),
  );

  if (!migrationReport.every((row) => row.applied && row.checksumMatch)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    "[sce-cd-connected-workspace-disposable-migration-verify] FAILED:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});