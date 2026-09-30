/**
 * SCE-PILOT-03 — sync allocation + content view permission catalog rows.
 * Defaults to DRY RUN. APPLY_PERMISSION_SYNC=true to write (STAGE only guard).
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { reconcileScePilot03Permissions } from "@/lib/permissions/sce-pilot-03-permission-reconciliation";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const DRY_RUN = process.env.APPLY_PERMISSION_SYNC !== "true";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[sync-sce-pilot-03-permissions] DATABASE_URL is required.");
  process.exit(1);
}

if (!DRY_RUN) {
  assertOperationalMutationAllowed({
    operationId: "sync-sce-pilot-03-permissions",
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
    `\n[sync-sce-pilot-03-permissions] Starting… (mode: ${DRY_RUN ? "DRY RUN" : "APPLY"})\n`,
  );

  const result = await reconcileScePilot03Permissions(prisma, DRY_RUN);

  for (const outcome of result.permissions) {
    const marker = outcome.action === "created" ? "+" : outcome.action === "updated" ? "~" : "✓";
    console.log(`  ${marker}  ${outcome.key} (${outcome.action})`);
  }

  if (DRY_RUN) {
    console.log(
      "\nDRY RUN — no writes. Apply with APPLY_PERMISSION_SYNC=true npx tsx scripts/sync-sce-pilot-03-permissions.ts\n",
    );
  } else {
    console.log("\nDone. Re-login required for JWT permission refresh.\n");
  }
}

main()
  .catch((err) => {
    console.error("[sync-sce-pilot-03-permissions] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
