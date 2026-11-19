/**
 * SCE-ANLIEGEN-01 — idempotent meldung permission sync (catalog only).
 *
 *   npx tsx scripts/sync-meldung-permissions.ts
 *   APPLY_PERMISSION_SYNC=true npx tsx scripts/sync-meldung-permissions.ts
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { reconcileMeldungPermissions } from "@/lib/permissions/meldung-permission-reconciliation";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const DRY_RUN = process.env.APPLY_PERMISSION_SYNC !== "true";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[sync-meldung-permissions] ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

if (!DRY_RUN) {
  assertOperationalMutationAllowed({
    operationId: "sync-meldung-permissions",
    databaseUrl: connectionString,
    explicitIntent: process.env.APPLY_PERMISSION_SYNC === "true",
    allowedRemoteEnvironments: ["stage"],
  });
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`[sync-meldung-permissions] mode=${DRY_RUN ? "DRY_RUN" : "APPLY"}`);
  const result = await reconcileMeldungPermissions(prisma, DRY_RUN);
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