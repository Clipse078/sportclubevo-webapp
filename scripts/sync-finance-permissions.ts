/**
 * SCE-FINANCE-01B — organisation finance permission reconciliation.
 *
 *   npx tsx scripts/sync-finance-permissions.ts
 *   APPLY_PERMISSION_SYNC=true npx tsx scripts/sync-finance-permissions.ts
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { reconcileFinancePermissions } from "@/lib/permissions/finance-permission-reconciliation";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[sync-finance-permissions] DATABASE_URL is not set.");
  process.exit(1);
}

const dryRun = process.env.APPLY_PERMISSION_SYNC !== "true";

if (!dryRun) {
  assertOperationalMutationAllowed(
    {
      operationId: "sync-finance-permissions",
      databaseUrl: connectionString,
      explicitIntent: true,
      allowedRemoteEnvironments: ["acceptance", "stage", "prod"],
      operationSpecificAuthorization: true,
    },
    process.env,
  );
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(`[sync-finance-permissions] mode=${dryRun ? "dry-run" : "apply"}`);

  const result = await reconcileFinancePermissions(prisma, dryRun);

  console.log("Finance catalog:", result.permissions.map((p) => `${p.key}:${p.action}`).join(", "));
  const clubAdminAssigned = result.tenantClubAdmin.tenantClubAdminRoles.filter(
    (row) => row.action === "assigned" && row.permissionKey.startsWith("finance."),
  );
  console.log(`Club Admin finance grants (new): ${clubAdminAssigned.length}`);
  if (clubAdminAssigned.length > 0) {
    for (const row of clubAdminAssigned.slice(0, 12)) {
      console.log(`  ${row.roleKey} ← ${row.permissionKey}`);
    }
  }

  if (dryRun) {
    console.log(
      "\nDRY RUN — no writes. Apply with APPLY_PERMISSION_SYNC=true npx tsx scripts/sync-finance-permissions.ts\n",
    );
  }
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
