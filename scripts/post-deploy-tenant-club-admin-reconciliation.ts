/**
 * Runs after a guarded `prisma migrate deploy` to align tenant Club Admin
 * roles with the live permission catalog (including permissions introduced
 * after tenant bootstrap).
 *
 * Invoked only from scripts/deploy-migrations-if-enabled.ts when
 * APPLY_DATABASE_MIGRATIONS=true.
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { reconcileTenantClubAdminPermissions } from "@/lib/permissions/tenant-club-admin-permission-reconciliation";

const connectionString =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!connectionString) {
  console.error("[post-deploy-club-admin-reconcile] DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("[post-deploy-club-admin-reconcile] Applying tenant Club Admin catalog reconciliation…");
  const result = await reconcileTenantClubAdminPermissions(prisma, false);
  const assigned = result.tenantClubAdminRoles.filter((row) => row.action === "assigned");
  console.log(
    `[post-deploy-club-admin-reconcile] complete — ${assigned.length} new RolePermission row(s).`,
  );
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
