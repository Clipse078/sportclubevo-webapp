import { prisma } from "@/lib/db/prisma";
import { isTenantClubAdmin } from "@/lib/roles/is-tenant-club-admin";
import { isPlatformSuperAdmin } from "@/lib/security/platform-superadmin";

/**
 * SCE-CD-01R2 — Vereinsleitung workspace access policy.
 *
 * Granted when the user is any of:
 *   1. SCE platform Superadmin (`super_admin` assignment) — any active tenant context.
 *   2. Materialized tenant Club Admin for `tenantId` — own club only.
 *   3. Holder of a role with `canAccessVereinsleitung` in that tenant — own club only.
 *
 * All other users are denied. Queries remain tenant-scoped via `tenantId`.
 */
export async function userHasVereinsleitungWorkspaceAccess(
  userId: string,
  tenantId: string,
): Promise<boolean> {
  if (await isPlatformSuperAdmin(prisma, userId)) {
    return true;
  }

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId,
      userId,
      isActive: true,
      tenant: { status: "ACTIVE" },
      user: { isActive: true },
    },
    select: { tenant: { select: { key: true } } },
  });
  if (!membership?.tenant?.key) return false;

  const tenantKey = membership.tenant.key;

  if (await isTenantClubAdmin(userId, tenantId, tenantKey)) {
    return true;
  }

  const vlAssignment = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        isArchived: false,
        canAccessVereinsleitung: true,
      },
      OR: [
        {
          tenantId: null,
          role: {
            scope: "PLATFORM",
            tenantId: null,
          },
        },
        {
          tenantId,
          role: {
            scope: "TENANT",
            tenantId,
          },
        },
      ],
    },
    select: { id: true },
  });

  return vlAssignment !== null;
}
