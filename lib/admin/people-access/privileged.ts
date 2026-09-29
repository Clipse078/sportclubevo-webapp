import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export { userHasPrivilegedRole } from "@/lib/admin/people-access/privileged-utils";

/** Role IDs whose tenant permissions include users.manage_memberships. */
export async function getPrivilegedTenantRoleIds(tenantId: string): Promise<string[]> {
  const roles = await prisma.role.findMany({
    where: { tenantId, scope: "TENANT", isArchived: false },
    select: {
      id: true,
      rolePermissions: {
        select: { permission: { select: { key: true } } },
      },
    },
  });

  return roles
    .filter((r) =>
      r.rolePermissions.some((rp) => rp.permission.key === PERMISSIONS.USERS_MANAGE_MEMBERSHIPS),
    )
    .map((r) => r.id);
}
