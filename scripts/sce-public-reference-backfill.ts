/**
 * Backfill global SCE public numbers for existing Strategie, Ziel, Aufgabe, and Anliegen rows.
 *
 * Dry-run performs no writes. Live mode requires SCE_OPERATION_AUTHORIZATION on remote STAGE.
 *
 * Usage:
 *   npx tsx scripts/sce-public-reference-backfill.ts [--tenant <id>] [--dry-run]
 *
 * STAGE dry-run (read-only):
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     npx tsx scripts/sce-public-reference-backfill.ts --dry-run
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { formatScePublicReference } from "@/lib/club-development/sce-public-reference";
import {
  assertScePublicReferenceBackfillAllowed,
  runScePublicReferenceBackfillCli,
} from "@/lib/club-development/sce-public-reference-backfill-cli";

const dryRun = process.argv.includes("--dry-run");
const tenantArgIdx = process.argv.indexOf("--tenant");
const tenantFilter =
  tenantArgIdx >= 0 ? process.argv[tenantArgIdx + 1]?.trim() ?? null : null;

const connectionString = process.env.DATABASE_URL?.trim();
assertScePublicReferenceBackfillAllowed({
  dryRun,
  tenantFilter,
  databaseUrl: connectionString,
});

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const report = await runScePublicReferenceBackfillCli(prisma, {
    dryRun,
    tenantFilter,
    databaseUrl: connectionString,
  });

  if (report.collisionAbort) {
    console.error(
      `Aborting backfill — found ${report.collisions.length} duplicate scePublicNumber value(s) already issued:`,
    );
    for (const row of report.collisions) {
      console.error(
        `  ${formatScePublicReference(BigInt(row.scePublicNumber))}: ${row.occurrences} assignments`,
      );
    }
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 2;
    return;
  }

  console.log(
    JSON.stringify(
      {
        ...report,
        message: dryRun
          ? `Dry run complete — ${report.assigned} rows would receive SCE numbers across ${report.tenantCount} tenant(s).`
          : `Backfill complete — assigned ${report.assigned} SCE numbers across ${report.tenantCount} tenant(s).`,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });