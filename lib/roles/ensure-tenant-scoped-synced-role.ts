/**
 * Ensures data-synced tenant roles appear in mandanten role lists (scope TENANT).
 * Pilot/sync scripts historically omitted scope, defaulting to PLATFORM.
 */

import { prisma } from "@/lib/db/prisma";

export type TenantRoleScopeReconcileResult =
  | { status: "ok"; roleId: string }
  | { status: "missing" }
  | { status: "reconciled"; roleId: string; previousScope: string };

/**
 * Find a tenant-owned role by key or display name and reconcile scope to TENANT when needed.
 */
export async function ensureTenantScopedRoleByKeyOrName(
  tenantId: string,
  match: { key?: string; name?: string },
): Promise<TenantRoleScopeReconcileResult> {
  if (!match.key && !match.name) {
    return { status: "missing" };
  }

  const role = await prisma.role.findFirst({
    where: {
      tenantId,
      OR: [
        ...(match.key ? [{ key: match.key }] : []),
        ...(match.name ? [{ name: match.name }] : []),
      ],
    },
    select: { id: true, scope: true, tenantId: true },
  });

  if (!role || role.tenantId !== tenantId) {
    return { status: "missing" };
  }

  if (role.scope === "TENANT") {
    return { status: "ok", roleId: role.id };
  }

  await prisma.role.update({
    where: { id: role.id },
    data: { scope: "TENANT", tenantId },
  });

  return { status: "reconciled", roleId: role.id, previousScope: role.scope };
}