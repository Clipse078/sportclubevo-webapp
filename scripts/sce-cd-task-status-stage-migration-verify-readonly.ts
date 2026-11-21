/**
 * PR #1018 — read-only STAGE migration checksum + WAITING enum inventory.
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     npm run cd-task-status:stage-migration-verify
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/db/prisma";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import {
  SCE_CD_TASK_STATUS_MIGRATION_ORDER,
  SCE_CD_TASK_STATUS_WAITING_CHECKSUM_SHA256,
  SCE_CD_TASK_STATUS_WAITING_ENSURE_CHECKSUM_SHA256,
} from "@/lib/club-development/sce-cd-task-status-migration-handoff";
import { SCE_CD_TASK_STATUS_ROLLOUT_STEPS } from "@/lib/club-development/sce-cd-task-status-rollout";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";

function migrationChecksum(name: string): string {
  const sqlPath = path.join(process.cwd(), `prisma/migrations/${name}/migration.sql`);
  return crypto.createHash("sha256").update(fs.readFileSync(sqlPath)).digest("hex");
}

async function main(): Promise<void> {
  const fp = getDatabaseFingerprintFromEffectivePrismaSource(process.env);
  const runtime = getRuntimeEnvironment(process.env);
  const host = new URL(process.env.DATABASE_URL ?? "").hostname;

  const rows = await prisma.$queryRaw<
    Array<{ migration_name: string; checksum: string; finished_at: Date | null }>
  >`
    SELECT migration_name, checksum, finished_at
    FROM "_prisma_migrations"
    WHERE migration_name = ANY(${[...SCE_CD_TASK_STATUS_MIGRATION_ORDER]}::text[])
  `;

  const enumLabels = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TaskStatus'
    ORDER BY e.enumsortorder
  `;

  const waitingRows = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT count(*)::int AS c FROM "Task" WHERE status::text = 'WAITING'
  `;

  const migrationReport = SCE_CD_TASK_STATUS_MIGRATION_ORDER.map((name) => {
    const row = rows.find((r) => r.migration_name === name);
    const repo = migrationChecksum(name);
    const expected =
      name === SCE_CD_TASK_STATUS_MIGRATION_ORDER[0]
        ? SCE_CD_TASK_STATUS_WAITING_CHECKSUM_SHA256
        : SCE_CD_TASK_STATUS_WAITING_ENSURE_CHECKSUM_SHA256;
    return {
      name,
      applied: Boolean(row?.finished_at),
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
        writePerformed: false,
        databaseIdentity: {
          appEnv: runtime.appEnv,
          dataEnvironment: getRuntimeDataEnvironment(),
          host,
          fingerprint: fp,
          fingerprintMatch: fp === STAGE_CANONICAL_DATABASE_FINGERPRINT,
        },
        taskStatusEnum: enumLabels.map((r) => r.enumlabel),
        waitingTaskRowCount: waitingRows[0]?.c ?? null,
        migrationReport,
        releaseOrder: SCE_CD_TASK_STATUS_ROLLOUT_STEPS,
      },
      null,
      2,
    ),
  );

  if (
    !migrationReport.every((r) => r.applied && r.checksumMatch) ||
    !enumLabels.some((r) => r.enumlabel === "WAITING") ||
    (waitingRows[0]?.c ?? 0) !== 0
  ) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().catch(() => undefined));