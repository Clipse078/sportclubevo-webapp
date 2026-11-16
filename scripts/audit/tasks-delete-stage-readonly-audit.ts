/**
 * Read-only STAGE audit: tasks.delete permission row and Club Admin grants.
 * Does not write. Exits 0 when audit completes (even if permission is missing).
 */
import { prisma } from "@/lib/db/prisma";
import { CLUB_ADMIN_TEMPLATE_KEY } from "@/lib/roles/tenant-role-keys";

const KEY = "tasks.delete";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[tasks-delete-audit] DATABASE_URL not set — skip remote verification.");
    process.exit(0);
  }

  try {
    const permission = await prisma.permission.findUnique({ where: { key: KEY } });
    console.log(
      JSON.stringify(
        {
          permission: permission
            ? {
                key: permission.key,
                module: permission.module,
                scope: permission.scope,
                grantableByAdmin: permission.grantableByAdmin,
              }
            : null,
        },
        null,
        2,
      ),
    );

    if (!permission) {
      console.log("[tasks-delete-audit] Permission row missing on target database.");
      return;
    }

    const clubAdminRoles = await prisma.role.findMany({
      where: {
        scope: "TENANT",
        isSystem: true,
        key: { startsWith: `${CLUB_ADMIN_TEMPLATE_KEY}__` },
      },
      select: { key: true, id: true },
    });

    const grants = await prisma.rolePermission.findMany({
      where: { permissionId: permission.id, roleId: { in: clubAdminRoles.map((r) => r.id) } },
      select: { role: { select: { key: true } } },
    });

    console.log(
      JSON.stringify(
        {
          tenantClubAdminRoleCount: clubAdminRoles.length,
          clubAdminRolesWithTasksDelete: grants.map((g) => g.role.key).sort(),
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error("[tasks-delete-audit] failed", error);
  process.exit(1);
});