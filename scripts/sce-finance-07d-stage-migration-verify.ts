/**
 * SCE-FIN-07D — designated STAGE migration verify (read-only inventory).
 *
 * Apply migrations (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";

const MIGRATION_07D = "20261028120000_sce_finance_07d_commitment_approval_policy";

function assertDesignatedStage(): void {
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
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${name}
  `;
  return rows.length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
  `;
  return rows.length > 0;
}

async function migrationApplied(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE migration_name = ${name} AND finished_at IS NOT NULL
  `;
  return rows.length > 0;
}

async function main(): Promise<void> {
  assertDesignatedStage();

  const snapshot = {
    migrationName: MIGRATION_07D,
    applied: await migrationApplied(MIGRATION_07D),
    financeCommitmentApprovalPolicyTable: await tableExists("FinanceCommitmentApprovalPolicy"),
    commitmentSnapshotColumns: {
      approvalPolicyEnabledSnapshot: await columnExists(
        "FinanceCommitment",
        "approvalPolicyEnabledSnapshot",
      ),
      approvalThresholdMinorSnapshot: await columnExists(
        "FinanceCommitment",
        "approvalThresholdMinorSnapshot",
      ),
      approvalPolicyCurrencySnapshot: await columnExists(
        "FinanceCommitment",
        "approvalPolicyCurrencySnapshot",
      ),
    },
    commitmentRowCount: await prisma.financeCommitment.count(),
  };

  console.log(JSON.stringify(snapshot, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
