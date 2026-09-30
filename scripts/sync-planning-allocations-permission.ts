/**
 * SCE — sync planning.allocations.* catalog + canonical Club Admin backfill.
 * DRY RUN by default. APPLY_PERMISSION_SYNC=true to write (STAGE guard).
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { reconcilePlanningAllocationsPermissions } from "@/lib/permissions/planning-allocations-permission-reconciliation";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const DRY_RUN = process.env.APPLY_PERMISSION_SYNC !== "true";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[sync-planning-allocations-permission] DATABASE_URL is required.");
  process.exit(1);
}

if (!DRY_RUN) {
  assertOperationalMutationAllowed({
    operationId: "sync-planning-allocations-permission",
    databaseUrl: connectionString,
    explicitIntent: true,
    allowedRemoteEnvironments: ["stage"],
  });
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(
    `\n[sync-planning-allocations-permission] Starting… (mode: ${DRY_RUN ? "DRY RUN" : "APPLY"})\n`,
  );

  const result = await reconcilePlanningAllocationsPermissions(prisma, DRY_RUN);

  for (const outcome of result.permissions) {
    const marker = outcome.action === "created" ? "+" : outcome.action === "updated" ? "~" : "✓";
    console.log(`  ${marker}  permission ${outcome.key} (${outcome.action})`);
  }

  console.log(`\n  Tenant Club Admin roles processed: ${result.tenantClubAdminRoles.length / 2}`);

  if (DRY_RUN) {
    console.log(
      "\nDRY RUN — no writes. Apply with APPLY_PERMISSION_SYNC=true npx tsx scripts/sync-planning-allocations-permission.ts\n",
    );
  } else {
    console.log("\nDone. Re-login required for JWT permission refresh.\n");
  }
}

main()
  .catch((err) => {
    console.error("[sync-planning-allocations-permission] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
