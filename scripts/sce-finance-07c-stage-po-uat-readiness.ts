/**
 * FIN-07C — verify STAGE / Preview data target exposes UAT commitments to workspace + inbox.
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   DATABASE_URL=$STAGE_DB_URL npx tsx scripts/sce-finance-07c-stage-po-uat-readiness.ts
 */

import { prisma } from "@/lib/db/prisma";
import { verifyFin07cPoUatReadiness } from "@/lib/finance/commitment/finance-07c-po-uat-readiness";

async function main() {
  const report = await verifyFin07cPoUatReadiness(prisma, process.env);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ready) {
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
