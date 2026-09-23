/**
 * Canonical tenant Club Admin membership (RPERM materialized role + active membership).
 */

import { prisma } from "@/lib/db/prisma";
import { getTenantClubAdminRoleKey } from "@/lib/roles/tenant-role-keys";

export async function isTenantClubAdmin(
  userId: string,
  tenantId: string,
  tenantKey: string,
): Promise<boolean> {
  const clubAdminRoleKey = getTenantClubAdminRoleKey(tenantKey);
  const count = await prisma.userRole.count({
    where: {
      userId,
      tenantId,
      role: { key: clubAdminRoleKey },
      user: {
        tenantMemberships: {
          some: { tenantId, isActive: true },
        },
      },
    },
  });
  return count > 0;
}
