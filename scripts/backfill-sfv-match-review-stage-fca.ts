/**
 * Backfill reviewStage for SFV-imported MATCH events (FC Allschwil).
 *
 * Root cause: SFV schedule sync created MATCH rows with Prisma default
 * reviewStage=DRAFT while public website feeds require APPROVED|PUBLISHED
 * (SCE-ACTIVITY-CREATE-01C). websiteVisible=true alone is insufficient.
 *
 * SAFETY
 *   - Tenant-scoped: key = fc-allschwil
 *   - Only source = SFV, type = MATCH, reviewStage = DRAFT
 *   - Never touches manually created matches (source != SFV)
 *   - Dry-run via --dry-run
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/backfill-sfv-match-review-stage-fca.ts [--dry-run]
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  if (isDryRun) {
    console.log("DRY RUN — no writes.\n");
  } else {
    assertOperationalMutationAllowed({
      operationId: "backfill-sfv-match-review-stage-fca",
      databaseUrl: process.env.DATABASE_URL,
      explicitIntent: true,
      allowedRemoteEnvironments: ["stage", "prod"],
    });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const tenant = await prisma.tenant.findFirst({
      where: { key: "fc-allschwil", status: "ACTIVE" },
      select: { id: true, key: true, name: true },
    });

    if (!tenant) {
      throw new Error('Active tenant "fc-allschwil" not found.');
    }

    const where = {
      tenantId: tenant.id,
      type: "MATCH" as const,
      source: "SFV" as const,
      reviewStage: "DRAFT" as const,
    };

    const candidates = await prisma.event.findMany({
      where,
      select: {
        id: true,
        startAt: true,
        websiteVisible: true,
        homeAway: true,
        opponentName: true,
      },
      orderBy: { startAt: "asc" },
      take: 10,
    });

    const total = await prisma.event.count({ where });

    console.log(
      JSON.stringify(
        {
          tenant: tenant.key,
          totalDraftSfvMatches: total,
          sample: candidates.map((row) => ({
            id: row.id,
            startAt: row.startAt.toISOString(),
            homeAway: row.homeAway,
            opponentName: row.opponentName,
            websiteVisible: row.websiteVisible,
          })),
        },
        null,
        2,
      ),
    );

    if (isDryRun || total === 0) {
      return;
    }

    const result = await prisma.event.updateMany({
      where,
      data: { reviewStage: "APPROVED" },
    });

    console.log(`Updated reviewStage → APPROVED for ${result.count} SFV matches.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
