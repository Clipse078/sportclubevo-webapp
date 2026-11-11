import { prisma } from "@/lib/db/prisma";

/**
 * SCE-CD-01R1 — Vereinsleitung workspace membership.
 *
 * VL workspace and confidential strategic surfaces require an assigned role with
 * `Role.canAccessVereinsleitung = true`. Permission keys (including tenant
 * administration) do not imply VL membership.
 */
export async function userHasVereinsleitungWorkspaceAccess(
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId,
      userId,
      isActive: true,
      tenant: { status: "ACTIVE" },
      user: { isActive: true },
    },
    select: { id: true },
  });
  if (!membership) return false;

  const assignment = await prisma.userRole.findFirst({
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

  return assignment !== null;
}
