/**
 * FIN-07D — verify STAGE PO UAT post-submit functional state (read-only).
 *
 * Run after Product Owner submits the three threshold UAT commitments:
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   DATABASE_URL=$STAGE_DB_URL npx tsx scripts/sce-finance-07d-stage-po-uat-post-submit-verify.ts
 */

import { prisma } from "@/lib/db/prisma";
import {
  summarizeFin07dPostSubmitFlags,
  verifyFin07dPoUatPostSubmit,
} from "@/lib/finance/commitment/finance-07d-po-uat-post-submit";

async function main() {
  const report = await verifyFin07dPoUatPostSubmit(prisma, process.env);
  console.log(
    JSON.stringify(
      {
        pass: report.pass,
        awaitingPoSubmit: report.awaitingPoSubmit,
        pendingApprovalUatCount: report.pendingApprovalUatCount,
        productionTouched: report.productionTouched,
        flags: summarizeFin07dPostSubmitFlags(report.flags),
        detail: report,
      },
      null,
      2,
    ),
  );
  if (!report.pass) {
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
