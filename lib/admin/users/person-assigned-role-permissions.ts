/**
 * Admin-only projection: permission keys from persisted UserRole rows without
 * requiring an active TenantMembership. Login and route guards stay fail-closed
 * via EffectivePermissionResolver — this module is for Person detail UX only.
 */

import { prisma } from "@/lib/db/prisma";
import { listUserPermissionOverrides } from "@/lib/admin/people-access/user-permission-overrides";
import { applyPermissionOverrides } from "@/lib/permissions/apply-permission-overrides";

/**
 * Resolves tenant permission keys from assigned roles (+ overrides) when the
 * user has a membership row in this tenant (active or pending invitation).
 * Returns null when no membership exists (no cross-tenant leak).
 */
export async function resolveAssignedTenantPermissionKeysForProjection(
  tenantId: string,
  userId: string,
): Promise<Set<string> | null> {
  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { id: true },
  });
  if (!membership) return null;

  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      tenantId,
      role: {
        scope: "TENANT",
        tenantId,
        isArchived: false,
      },
    },
    select: {
      role: {
        select: {
          rolePermissions: {
            select: {
              permission: {
                select: {
                  key: true,
                  scope: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const roleBaseline = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      if (rp.permission.scope === "TENANT") {
        roleBaseline.add(rp.permission.key);
      }
    }
  }

  const overrides = await listUserPermissionOverrides(tenantId, userId);
  return applyPermissionOverrides(roleBaseline, overrides);
}