/**
 * DASHBOARD-04A / DASHBOARD-07 — read-only STAGE verification for quick-access preference migration.
 *
 *   npx tsx scripts/dashboard-04a-stage-migration-verify-readonly.ts
 *
 * Requires DATABASE_URL to point at STAGE (host fragment ep-wispy-hall-aso93dy6).
 * No schema writes.
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/db/prisma";
import { resolveDeploymentIdentity } from "@/lib/server/deployment-identity";

const MIGRATION = "20260923210000_dashboard_04_quick_access_preference";
const EXPECTED_HOST_FRAGMENT = "ep-wispy-hall-aso93dy6";
const EXPECTED_DB_NAME = "neondb";
const EXPECTED_FINGERPRINT = "acd3b37682911890";
const EXPECTED_CHECKSUM = "388b348864d023c5eaabf33ac80a9a79c87303fffbdae1995f483163ceaa9ca4";
const EXPECTED_FINISHED_AT = "2026-09-23T21:31:46.312Z";

function hostFromDatabaseUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const identity = resolveDeploymentIdentity(process.env);
  const host = identity.databaseHost;
  const dbName = hostFromDatabaseUrl(process.env.DATABASE_URL)
    ? (() => {
        try {
          return new URL(process.env.DATABASE_URL ?? "").pathname.replace(/^\//, "");
        } catch {
          return null;
        }
      })()
    : null;

  const migrationSqlPath = path.join(
    process.cwd(),
    "prisma/migrations/20260923210000_dashboard_04_quick_access_preference/migration.sql",
  );
  const migrationChecksum = crypto
    .createHash("sha256")
    .update(fs.readFileSync(migrationSqlPath))
    .digest("hex");

  const rows = await prisma.$queryRaw<
    Array<{ migration_name: string; checksum: string; finished_at: Date }>
  >`
    SELECT migration_name, checksum, finished_at
    FROM "_prisma_migrations"
    WHERE migration_name = ${MIGRATION}
  `;

  const pendingDashboard = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE finished_at IS NULL AND migration_name LIKE '%dashboard%'
  `;

  const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'UserDashboardQuickAccessPreference'
    ) AS exists
  `;

  const uniqueIdx = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'UserDashboardQuickAccessPreference'
      AND indexname = 'UserDashboardQuickAccessPreference_tenantId_userId_key'
  `;

  console.log(
    JSON.stringify(
      {
        databaseIdentity: {
          hostFragmentMatch: Boolean(host?.includes(EXPECTED_HOST_FRAGMENT)),
          databaseName: dbName,
          databaseNameMatch: dbName === EXPECTED_DB_NAME,
          fingerprint: identity.databaseFingerprint,
          fingerprintMatch: identity.databaseFingerprint === EXPECTED_FINGERPRINT,
        },
        migration: {
          name: MIGRATION,
          appliedCount: rows.length,
          checksum: rows[0]?.checksum ?? null,
          checksumMatch: rows[0]?.checksum === EXPECTED_CHECKSUM,
          repoChecksumMatch: migrationChecksum === EXPECTED_CHECKSUM,
          finishedAt: rows[0]?.finished_at?.toISOString?.() ?? null,
          finishedAtMatch: rows[0]?.finished_at?.toISOString?.() === EXPECTED_FINISHED_AT,
        },
        tableExists: tableExists[0]?.exists ?? false,
        uniqueTenantUserConstraint: uniqueIdx.length > 0,
        pendingDashboardMigrations: pendingDashboard,
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
