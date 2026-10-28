/**
 * FIN-07C — seed STAGE UAT commitments (SUBMITTED / PENDING) for PO approval testing.
 *
 * Dry-run:
 *   DATABASE_URL=$STAGE_DB_URL npx tsx scripts/sce-finance-07c-stage-uat-commitment-seed.ts
 *
 * Execute:
 *   SCE_OPERATION_AUTHORIZATION=finance-07c-stage-uat-commitment-seed:stage \
 *   DATABASE_URL=$STAGE_DB_URL APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE \
 *   SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   npx tsx scripts/sce-finance-07c-stage-uat-commitment-seed.ts --execute --confirm=SCE-FINANCE-07C-UAT-SEED
 */

import { prisma } from "@/lib/db/prisma";
import {
  evaluateSeedExecuteAllowed,
  seedFin07cUatCommitments,
  FIN_07C_UAT_SEED_META,
} from "@/lib/finance/commitment/finance-07c-stage-uat-commitment-seed";

const execute = process.argv.includes("--execute");
const confirmArg = process.argv.find((a) => a.startsWith("--confirm="));
const confirm = confirmArg?.split("=")[1] ?? null;

async function main() {
  const gate = evaluateSeedExecuteAllowed({ execute, confirm, env: process.env });
  console.log(JSON.stringify({ meta: FIN_07C_UAT_SEED_META, gate }, null, 2));
  if (execute && !gate.allowed) {
    process.exitCode = 1;
    return;
  }
  const result = await seedFin07cUatCommitments(prisma, { execute: execute && gate.allowed });
  console.log(JSON.stringify(result, null, 2));
  if (result.blockingErrors.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
