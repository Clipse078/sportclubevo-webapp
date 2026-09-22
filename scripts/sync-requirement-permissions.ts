/**
 * AUFGABEN-06G1 — idempotent requirements permission sync.
 *
 * Usage (dry run — default):
 *   npx tsx scripts/sync-requirement-permissions.ts
 *
 * Usage (apply):
 *   APPLY_PERMISSION_SYNC=true npx tsx scripts/sync-requirement-permissions.ts
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { reconcileRequirementPermissions } from "@/lib/permissions/requirement-permission-reconciliation";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const DRY_RUN = process.env.APPLY_PERMISSION_SYNC !== "true";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[sync-requirement-permissions] ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

if (!DRY_RUN) {
  assertOperationalMutationAllowed({
    operationId: "sync-requirement-permissions",
    databaseUrl: connectionString,
    explicitIntent: process.env.APPLY_PERMISSION_SYNC === "true",
    allowedRemoteEnvironments: ["stage"],
  });
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`[sync-requirement-permissions] mode=${DRY_RUN ? "DRY_RUN" : "APPLY"}`);
  const result = await reconcileRequirementPermissions(prisma, DRY_RUN);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
