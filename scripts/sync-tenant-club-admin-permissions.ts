/**
 * SCE — full tenant Club Admin permission catalog reconciliation.
 *
 * Usage:
 *   npx tsx scripts/sync-tenant-club-admin-permissions.ts
 *   APPLY_PERMISSION_SYNC=true npx tsx scripts/sync-tenant-club-admin-permissions.ts
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { reconcileTenantClubAdminPermissions } from "@/lib/permissions/tenant-club-admin-permission-reconciliation";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[sync-tenant-club-admin-permissions] DATABASE_URL is not set.");
  process.exit(1);
}

const dryRun = process.env.APPLY_PERMISSION_SYNC !== "true";
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(
    `[sync-tenant-club-admin-permissions] mode=${dryRun ? "dry-run" : "apply"}`,
  );

  const result = await reconcileTenantClubAdminPermissions(prisma, dryRun);

  const assigned = result.tenantClubAdminRoles.filter((row) => row.action === "assigned");
  console.log(
    `Expected delegatable permissions: ${result.expectedDelegatablePermissionKeys.length}`,
  );
  console.log(`New RolePermission rows: ${assigned.length}`);
  if (assigned.length > 0) {
    const sample = assigned.slice(0, 10);
    for (const row of sample) {
      console.log(`  ${row.roleKey} ← ${row.permissionKey}`);
    }
    if (assigned.length > sample.length) {
      console.log(`  … and ${assigned.length - sample.length} more`);
    }
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
