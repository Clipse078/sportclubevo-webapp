/**
 * Read-only audit: custom tenant roles holding users.impersonate_tenant
 *
 * Usage: npx tsx scripts/audit-custom-roles-impersonate-tenant.ts
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TENANT_CLUB_ADMIN_ROLE_KEY_PREFIX } from "@/lib/permissions/tenant-club-admin-permission-contract";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[audit] DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const permission = await prisma.permission.findUnique({
    where: { key: PERMISSIONS.USERS_IMPERSONATE_TENANT },
    select: { id: true, grantableByAdmin: true },
  });

  if (!permission) {
    console.log(JSON.stringify({ permissionFound: false, customRoles: [] }));
    return;
  }

  const rows = await prisma.role.findMany({
    where: {
      scope: "TENANT",
      isArchived: false,
      NOT: { key: { startsWith: TENANT_CLUB_ADMIN_ROLE_KEY_PREFIX } },
      rolePermissions: { some: { permissionId: permission.id } },
    },
    select: { id: true, key: true, name: true, tenantId: true, isSystem: true },
    orderBy: [{ tenantId: "asc" }, { key: "asc" }],
  });

  console.log(
    JSON.stringify(
      {
        permissionFound: true,
        grantableByAdmin: permission.grantableByAdmin,
        customRolesWithImpersonation: rows,
        count: rows.length,
      },
      null,
      2,
    ),
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
