/**
 * HOTFIX-WOCHENPLAN-01 — Multi-tenant backfill for SFV HOME matches stuck at
 * wochenplanVisible=false (import default before canonical HOME wochenplan default).
 *
 * EXECUTION:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   SCE_OPERATION_AUTHORIZATION=backfill-sfv-wochenplan-home-defaults \
 *   DATABASE_URL=<stage-url> npx tsx scripts/backfill-sfv-wochenplan-home-defaults.ts [--dry-run]
 *
 * LIMITATIONS:
 *   Event rows do not record explicit Wochenplan override provenance. HOME matches
 *   with wochenplanVisible=false and infoboardVisible=true cannot be distinguished
 *   from an administrator who intentionally disabled Wochenplan only. Review dry-run
 *   output before live execution.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { evaluateSfvHomeWochenplanRepair } from "@/lib/publishing/policy/match-wochenplan-repair-policy";

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  if (isDryRun) {
    console.log("DRY RUN — no database writes.\n");
  } else {
    console.log("LIVE RUN — database writes ACTIVE.\n");
    assertOperationalMutationAllowed({
      operationId: "backfill-sfv-wochenplan-home-defaults",
      databaseUrl: process.env.DATABASE_URL,
      explicitIntent: true,
      allowedRemoteEnvironments: ["stage"],
    });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  let scanned = 0;
  let eligible = 0;
  let updated = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {};

  try {
    const events = await prisma.event.findMany({
      where: { source: "SFV", type: "MATCH" },
      select: {
        id: true,
        tenantId: true,
        homeAway: true,
        wochenplanVisible: true,
        infoboardVisible: true,
        source: true,
        type: true,
        startAt: true,
        opponentName: true,
      },
      orderBy: [{ tenantId: "asc" }, { startAt: "asc" }],
    });

    scanned = events.length;
    console.log(`Scanned ${scanned} SFV MATCH events (all tenants).\n`);

    for (const event of events) {
      const decision = evaluateSfvHomeWochenplanRepair(event);
      if (!decision.eligible) {
        skipped++;
        skipReasons[decision.reason] = (skipReasons[decision.reason] ?? 0) + 1;
        continue;
      }

      eligible++;
      const prefix = isDryRun ? "[DRY]" : "[UPDATE]";
      console.log(
        `${prefix} id=${event.id} tenant=${event.tenantId} homeAway=${event.homeAway} ` +
          `opponent="${event.opponentName ?? "?"}" start=${event.startAt.toISOString()} ` +
          `wochenplanVisible: false → true`,
      );

      if (!isDryRun) {
        await prisma.event.update({
          where: { id: event.id },
          data: { wochenplanVisible: true },
        });
        updated++;
      }
    }

    console.log("\n── Summary ──");
    console.log(`  Scanned:     ${scanned}`);
    console.log(`  Eligible:    ${eligible}`);
    console.log(`  Updated:     ${isDryRun ? 0 : updated}`);
    console.log(`  Skipped:     ${skipped}`);
    console.log("  Skip reasons:", skipReasons);
    if (isDryRun) {
      console.log("\n  DRY RUN — no changes written.");
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
