/**
 * SCE public reference (#1021) — read-only STAGE / PR Preview migration inventory.
 *
 * No schema writes. Never logs credentials.
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     npx tsx scripts/sce-public-reference-stage-migration-verify-readonly.ts
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/db/prisma";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import {
  SCE_PUBLIC_REFERENCE_BIGINT_MIGRATION,
  SCE_PUBLIC_REFERENCE_FOUNDATION_CHECKSUM_SHA256,
  SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION,
  SCE_PUBLIC_REFERENCE_GLOBAL_CONVERSION_MIGRATION,
  SCE_PUBLIC_REFERENCE_MIGRATION_ORDER,
} from "@/lib/club-development/sce-public-reference-migration-handoff";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";

const EXPECTED_HOST_FRAGMENT = "ep-wispy-hall-aso93dy6";
const KNOWN_PREVIEW_NOTE =
  "PR Preview for sportclubevo-webapp-stage uses the shared STAGE Neon database (see docs/deployment/stage-preview-migration-runbook.md).";

function migrationChecksum(name: string): string {
  const sqlPath = path.join(process.cwd(), `prisma/migrations/${name}/migration.sql`);
  return crypto.createHash("sha256").update(fs.readFileSync(sqlPath)).digest("hex");
}

function assertDesignatedStageReadOnly(): void {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "production",
  });
  if (runtime.appEnv !== "stage") {
    throw new Error(`STAGE identity required: APP_ENV must be "stage" (got ${runtime.appEnv}).`);
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
}

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function main(): Promise<void> {
  assertDesignatedStageReadOnly();

  let host: string | null = null;
  try {
    host = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    host = null;
  }

  const applied = await prisma.$queryRaw<
    Array<{
      migration_name: string;
      checksum: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
    }>
  >`
    SELECT migration_name, checksum, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name IN (
      ${SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION},
      ${SCE_PUBLIC_REFERENCE_GLOBAL_CONVERSION_MIGRATION},
      ${SCE_PUBLIC_REFERENCE_BIGINT_MIGRATION}
    )
  `;

  const repoChecksums = Object.fromEntries(
    SCE_PUBLIC_REFERENCE_MIGRATION_ORDER.map((m) => [m, migrationChecksum(m)]),
  );

  const migrationReport = SCE_PUBLIC_REFERENCE_MIGRATION_ORDER.map((name) => {
    const row = applied.find((r) => r.migration_name === name && r.finished_at && !r.rolled_back_at);
    return {
      name,
      applied: Boolean(row),
      checksumInDb: row?.checksum ?? null,
      repoChecksum: repoChecksums[name],
      checksumMatch: row?.checksum === repoChecksums[name],
      finishedAt: row?.finished_at?.toISOString?.() ?? null,
    };
  });

  const foundationRow = applied.find(
    (r) => r.migration_name === SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION && r.finished_at,
  );

  const bigintColumn = await prisma.$queryRaw<Array<{ data_type: string }>>`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ScePublicNumberSequence' AND column_name = 'nextNumber'
  `;

  console.log(
    JSON.stringify(
      {
        previewDatabaseNote: KNOWN_PREVIEW_NOTE,
        databaseIdentity: {
          hostFragmentMatch: Boolean(host?.includes(EXPECTED_HOST_FRAGMENT)),
          fingerprint: getDatabaseFingerprintFromEffectivePrismaSource(process.env),
          designatedStageFingerprint: STAGE_CANONICAL_DATABASE_FINGERPRINT,
        },
        stageFoundationChecksumExpected: SCE_PUBLIC_REFERENCE_FOUNDATION_CHECKSUM_SHA256,
        stageFoundationChecksumRecorded: foundationRow?.checksum ?? null,
        stageFoundationChecksumMatch:
          foundationRow?.checksum === SCE_PUBLIC_REFERENCE_FOUNDATION_CHECKSUM_SHA256,
        migrationOrder: [...SCE_PUBLIC_REFERENCE_MIGRATION_ORDER],
        migrationReport,
        schemaInventory: {
          tenantScePublicNumberSequence: await tableExists("TenantScePublicNumberSequence"),
          scePublicNumberSequence: await tableExists("ScePublicNumberSequence"),
          scePublicNumberLedger: await tableExists("ScePublicNumberLedger"),
          nextNumberColumnType: bigintColumn[0]?.data_type ?? null,
        },
        poApprovalScope: {
          schemaVerification: migrationReport.every((m) => m.checksumMatch || m.name === SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION && foundationRow?.checksum === SCE_PUBLIC_REFERENCE_FOUNDATION_CHECKSUM_SHA256),
          deployPendingMigrations: [
            SCE_PUBLIC_REFERENCE_GLOBAL_CONVERSION_MIGRATION,
            SCE_PUBLIC_REFERENCE_BIGINT_MIGRATION,
          ].filter((name) => !migrationReport.find((m) => m.name === name)?.applied),
          backfillDryRun:
            "npx tsx scripts/sce-public-reference-backfill.ts --dry-run (PO-owned, after deploy + app release)",
        },
        readOnly: true,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });