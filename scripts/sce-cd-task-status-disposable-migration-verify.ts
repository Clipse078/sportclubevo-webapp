/**
 * PR #1018 — disposable Postgres replay for TaskStatus::WAITING migrations.
 *
 *   TEST_DATABASE_URL=postgresql://localhost/sce_cd_task_status_fresh \
 *     npm run cd-task-status:disposable-migration-verify
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
  SCE_CD_TASK_STATUS_MIGRATION_ORDER,
  SCE_CD_TASK_STATUS_WAITING_CHECKSUM_SHA256,
  SCE_CD_TASK_STATUS_WAITING_ENSURE_CHECKSUM_SHA256,
} from "@/lib/club-development/sce-cd-task-status-migration-handoff";
import {
  buildDisposablePrismaMigrateProcessEnv,
  collectPrismaMigrationEndpointReport,
} from "@/lib/test/safe-disposable-migration-env";
import { maskDatabaseUrl } from "@/lib/test/safe-test-database";

function migrationChecksum(name: string): string {
  const sqlPath = path.join(process.cwd(), `prisma/migrations/${name}/migration.sql`);
  return crypto.createHash("sha256").update(fs.readFileSync(sqlPath)).digest("hex");
}

async function loadApplied(connectionString: string) {
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const rows = await prisma.$queryRaw<
      Array<{ migration_name: string; checksum: string; finished_at: Date | null }>
    >`
      SELECT migration_name, checksum, finished_at
      FROM "_prisma_migrations"
      WHERE migration_name = ANY(${[...SCE_CD_TASK_STATUS_MIGRATION_ORDER]}::text[])
        AND finished_at IS NOT NULL
        AND rolled_back_at IS NULL
    `;
    const waiting = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'TaskStatus'
    `;
    return { rows, waiting: waiting.map((r) => r.enumlabel) };
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
  if (!connectionString) throw new Error("Disposable DATABASE_URL missing after guard.");

  const { rows, waiting } = await loadApplied(connectionString);
  const repo50000 = migrationChecksum(SCE_CD_TASK_STATUS_MIGRATION_ORDER[0]);
  const repo50100 = migrationChecksum(SCE_CD_TASK_STATUS_MIGRATION_ORDER[1]);

  const report = SCE_CD_TASK_STATUS_MIGRATION_ORDER.map((name) => {
    const row = rows.find((r) => r.migration_name === name);
    const repo =
      name === SCE_CD_TASK_STATUS_MIGRATION_ORDER[0] ? repo50000 : repo50100;
    const expected =
      name === SCE_CD_TASK_STATUS_MIGRATION_ORDER[0]
        ? SCE_CD_TASK_STATUS_WAITING_CHECKSUM_SHA256
        : SCE_CD_TASK_STATUS_WAITING_ENSURE_CHECKSUM_SHA256;
    return {
      name,
      applied: Boolean(row),
      checksumInDb: row?.checksum ?? null,
      repoChecksum: repo,
      expectedStageChecksum: expected,
      checksumMatch: row?.checksum === repo && repo === expected,
      finishedAt: row?.finished_at?.toISOString?.() ?? null,
    };
  });

  console.log(
    JSON.stringify(
      {
        pullRequest: 1018,
        writePerformed: true,
        disposableTarget: maskDatabaseUrl(connectionString),
        endpointsBeforeGuard: endpointsBefore,
        migrationReport: report,
        taskStatusEnum: waiting,
        waitingPresent: waiting.includes("WAITING"),
        note: "Full-chain replay on disposable Postgres; shared STAGE was not targeted.",
      },
      null,
      2,
    ),
  );

  if (!report.every((r) => r.applied && r.checksumMatch) || !waiting.includes("WAITING")) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});