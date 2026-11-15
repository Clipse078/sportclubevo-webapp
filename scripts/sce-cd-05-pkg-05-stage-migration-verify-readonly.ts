/**
 * SCE-CD-05 PKG-05 — read-only STAGE / PR Preview migration inventory for club strategy authoring.
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     npx tsx scripts/sce-cd-05-pkg-05-stage-migration-verify-readonly.ts
 *
 * No schema writes. Never logs credentials.
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/db/prisma";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { getRuntimeEnvironment } from "@/lib/env";

const MIGRATION = "20261115150000_sce_cd_05_club_strategy_authoring";
const EXPECTED_HOST_FRAGMENT = "ep-wispy-hall-aso93dy6";
const KNOWN_PREVIEW_NOTE =
  "PR Preview for sportclubevo-webapp-stage uses the shared STAGE Neon database (see docs/deployment/stage-preview-migration-runbook.md).";

function migrationChecksum(): string {
  const sqlPath = path.join(process.cwd(), `prisma/migrations/${MIGRATION}/migration.sql`);
  return crypto.createHash("sha256").update(fs.readFileSync(sqlPath)).digest("hex");
}

async function main(): Promise<void> {
  const runtime = getRuntimeEnvironment(process.env);
  const fingerprint = getDatabaseFingerprintFromEffectivePrismaSource(process.env);
  const dataEnv = getRuntimeDataEnvironment();

  let host: string | null = null;
  try {
    host = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    host = null;
  }

  const applied = await prisma.$queryRaw<
    Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>
  >`
    SELECT migration_name, checksum, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name = ${MIGRATION}
  `;

  const pendingClubStrategy = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE finished_at IS NULL AND migration_name LIKE '%club_strategy%'
  `;

  const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ClubStrategy'
    ) AS exists
  `;

  const columnChecks = await prisma.$queryRaw<
    Array<{ column_name: string; data_type: string }>
  >`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ClubStrategy'
      AND column_name IN ('linkedMeetingRefs', 'linkedDecisionRefs', 'tenantId')
    ORDER BY column_name
  `;

  const enumExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'ClubStrategyDocumentKind'
    ) AS exists
  `;

  const rowCount = tableExists[0]?.exists
    ? await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "ClubStrategy"`
    : [{ count: BigInt(0) }];

  const repoChecksum = migrationChecksum();
  const row = applied.find((r) => r.finished_at && !r.rolled_back_at);

  console.log(
    JSON.stringify(
      {
        previewDatabaseNote: KNOWN_PREVIEW_NOTE,
        databaseIdentity: {
          appEnv: runtime.appEnv,
          dataEnvironment: dataEnv,
          hostFragmentMatch: Boolean(host?.includes(EXPECTED_HOST_FRAGMENT)),
          fingerprint,
          fingerprintMatch: fingerprint === STAGE_CANONICAL_DATABASE_FINGERPRINT,
          designatedStageFingerprint: STAGE_CANONICAL_DATABASE_FINGERPRINT,
        },
        migration: {
          name: MIGRATION,
          applied: Boolean(row),
          pendingFailedRows: applied.filter((r) => !r.finished_at || r.rolled_back_at).length,
          checksumInDb: row?.checksum ?? null,
          checksumMatch: row?.checksum === repoChecksum,
          repoChecksum,
          finishedAt: row?.finished_at?.toISOString?.() ?? null,
        },
        schemaReady: {
          clubStrategyTable: tableExists[0]?.exists ?? false,
          clubStrategyDocumentKindEnum: enumExists[0]?.exists ?? false,
          columns: columnChecks,
          clubStrategyRowCount: Number(rowCount[0]?.count ?? 0),
        },
        pendingClubStrategyMigrations: pendingClubStrategy,
        writePerformed: false,
        scopedApplyProcedure: {
          order: [
            "Confirm STAGE fingerprint and APP_ENV=stage (not production).",
            "Run this script (read-only inventory).",
            "If migration pending: APP_ENV=stage NODE_ENV=production APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled",
            "Re-run this script; clubStrategyTable and columns must be present.",
            "Re-test PR Preview /vereinsleitung/strategie persistence.",
          ],
          recovery:
            "Additive-only migration: rollback is forward-fix only (new migration). Do not truncate ClubStrategy on shared STAGE.",
        },
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