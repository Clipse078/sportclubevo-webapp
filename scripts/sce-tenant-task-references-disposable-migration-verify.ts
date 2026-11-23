/**
 * PR #1028 — disposable Postgres migration replay (never STAGE / production).
 *
 *   TEST_DATABASE_URL=postgresql://localhost/sce_tenant_task_refs_fresh \
 *     npm run sce-tenant-task-references:disposable-migration-verify
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

import {
  SCE_TENANT_PUBLIC_REFERENCES_MIGRATION,
  SCE_TENANT_PUBLIC_REFERENCES_MIGRATION_ORDER,
} from "@/lib/tenant-public-reference/sce-tenant-public-reference-migration-handoff";
import {
  buildDisposablePrismaMigrateProcessEnv,
  collectPrismaMigrationEndpointReport,
} from "@/lib/test/safe-disposable-migration-env";
import { maskDatabaseUrl } from "@/lib/test/safe-test-database";

function migrationChecksum(name: string): string {
  const sqlPath = path.join(process.cwd(), `prisma/migrations/${name}/migration.sql`);
  return crypto.createHash("sha256").update(fs.readFileSync(sqlPath)).digest("hex");
}

async function tableExists(
  prisma: PrismaClient,
  name: string,
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ reg: string | null }>>(
    `SELECT to_regclass('public."${name}"')::text AS reg`,
  );
  return Boolean(rows[0]?.reg);
}

async function verifySchema(prisma: PrismaClient): Promise<boolean> {
  const tenantShortCodeColumn = await prisma.$queryRawUnsafe<
    Array<{ exists: boolean }>
  >(
    `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Tenant' AND column_name = 'publicReferenceShortCode'
      ) AS exists`,
  );
  const tenantPublicNumberColumns = await prisma.$queryRawUnsafe<
    Array<{ table_name: string; exists: boolean }>
  >(
    `SELECT table_name, EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = t.table_name AND c.column_name = 'tenantPublicNumber'
      ) AS exists
     FROM (VALUES ('Task'), ('ClubStrategy'), ('Target'), ('ClubMeldung')) AS t(table_name)`,
  );

  const allRecordColumnsReady = tenantPublicNumberColumns.every((row) => row.exists);

  return (
    Boolean(tenantShortCodeColumn[0]?.exists) &&
    allRecordColumnsReady &&
    (await tableExists(prisma, "SceTenantPublicNumberSequence")) &&
    (await tableExists(prisma, "SceTenantPublicNumberLedger"))
  );
}

async function loadAppliedMigrations(connectionString: string) {
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const rows = await prisma.$queryRaw<
      Array<{ migration_name: string; checksum: string; finished_at: Date | null }>
    >`
      SELECT migration_name, checksum, finished_at
      FROM "_prisma_migrations"
      WHERE migration_name = ANY(${[...SCE_TENANT_PUBLIC_REFERENCES_MIGRATION_ORDER]}::text[])
        AND finished_at IS NOT NULL
        AND rolled_back_at IS NULL
    `;
    const schemaOk = await verifySchema(prisma);
    return { rows, schemaOk };
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

  const { rows, schemaOk } = await loadAppliedMigrations(connectionString);
  const repoChecksum = migrationChecksum(SCE_TENANT_PUBLIC_REFERENCES_MIGRATION);

  const migrationReport = SCE_TENANT_PUBLIC_REFERENCES_MIGRATION_ORDER.map((name) => {
    const row = rows.find((r) => r.migration_name === name);
    return {
      name,
      applied: Boolean(row),
      checksumInDb: row?.checksum ?? null,
      repoChecksum,
      checksumMatch: row?.checksum === repoChecksum,
      finishedAt: row?.finished_at?.toISOString?.() ?? null,
    };
  });

  console.log(
    JSON.stringify(
      {
        pullRequest: 1028,
        writePerformed: true,
        disposableTarget: maskDatabaseUrl(connectionString),
        endpointsBeforeGuard: endpointsBefore,
        endpointsAfterGuard: collectPrismaMigrationEndpointReport(migrateEnv),
        migrationReport,
        schemaVerification: schemaOk ? "OK" : "FAILED",
        note: "Replayed on disposable Postgres only; shared STAGE was not targeted.",
      },
      null,
      2,
    ),
  );

  if (!migrationReport.every((row) => row.applied && row.checksumMatch) || !schemaOk) {
    process.exitCode = 1;
  } else {
    console.log("sce-tenant-public-references: disposable migration verify OK");
  }
}

main().catch((error) => {
  console.error(
    "[sce-tenant-task-references-disposable-migration-verify] FAILED:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});