/**
 * Backfill global SCE public numbers for existing Strategie, Ziel, Aufgabe, and Anliegen rows.
 * Run only against disposable / guarded databases — not shared STAGE without explicit approval.
 *
 * Usage: npx tsx scripts/sce-public-reference-backfill.ts [--tenant <id>] [--dry-run]
 */
import { PrismaClient } from "@prisma/client";
import { runScePublicReferenceBackfill } from "@/lib/club-development/sce-public-reference-backfill";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const tenantArgIdx = process.argv.indexOf("--tenant");
  const tenantFilter = tenantArgIdx >= 0 ? process.argv[tenantArgIdx + 1]?.trim() : null;

  const result = await runScePublicReferenceBackfill(prisma, { tenantFilter, dryRun });

  if (result.collisions.length > 0) {
    console.error(
      `Aborting backfill — found ${result.collisions.length} duplicate scePublicNumber value(s) already issued:`,
    );
    for (const row of result.collisions) {
      console.error(`  SCE-${row.scePublicNumber}: ${row.occurrences} assignments`);
    }
    process.exitCode = 2;
    return;
  }

  console.log(
    dryRun
      ? `Dry run complete — ${result.assigned} rows would receive SCE numbers across ${result.tenantCount} tenant(s).`
      : `Backfill complete — assigned ${result.assigned} SCE numbers across ${result.tenantCount} tenant(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });