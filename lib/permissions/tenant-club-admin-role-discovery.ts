/**
 * Discover tenant Club Admin role rows that must receive the delegatable
 * permission catalog (canonical materialized roles plus tenant-scoped aliases
 * such as pre-RPERM-05-C1 legacy keys still assigned to operators).
 */

import type { PrismaClient } from "@prisma/client";

import { isClubAdminRoleKey } from "@/lib/admin/people-access/role-product-copy";
import { CANONICAL_TENANT_CLUB_ADMIN_ROLE_WHERE } from "@/lib/permissions/tenant-club-admin-permission-contract";
import { getTenantClubAdminRoleKey } from "@/lib/roles/tenant-role-keys";

export async function listTenantClubAdminRoleKeysForReconciliation(
  prisma: PrismaClient,
): Promise<string[]> {
  const roleKeys = new Set<string>();

  const canonicalRoles = await prisma.role.findMany({
    where: CANONICAL_TENANT_CLUB_ADMIN_ROLE_WHERE,
    select: { key: true },
  });
  for (const role of canonicalRoles) {
    roleKeys.add(role.key);
  }

  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, key: true },
    orderBy: { key: "asc" },
  });

  for (const tenant of tenants) {
    const canonicalKey = getTenantClubAdminRoleKey(tenant.key);
    const tenantRoles = await prisma.role.findMany({
      where: {
        scope: "TENANT",
        tenantId: tenant.id,
        isArchived: false,
      },
      select: { key: true },
    });

    for (const role of tenantRoles) {
      if (isClubAdminRoleKey(role.key, canonicalKey)) {
        roleKeys.add(role.key);
      }
    }
  }

  return [...roleKeys].sort((a, b) => a.localeCompare(b));
}
