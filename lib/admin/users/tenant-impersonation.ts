/**
 * Tenant-scoped impersonation authorization (Club Admin "Als Benutzer ansehen").
 */

import { prisma } from "@/lib/db/prisma";
import { userHasPlatformSystemIdentity } from "@/lib/admin/people-access/platform-identity";

export type ImpersonationGateResult =
  | { ok: true; actorUserId: string; targetUserId: string; tenantId: string }
  | { ok: false; status: number; error: string; reasonCode?: string };

export async function assertCanImpersonateTenantMember(input: {
  actorUserId: string;
  actorTenantId: string | null | undefined;
  targetUserId: string;
}): Promise<ImpersonationGateResult> {
  const { actorUserId, targetUserId } = input;
  const tenantId = input.actorTenantId ?? null;

  if (!tenantId) {
    return {
      ok: false,
      status: 403,
      error: "Kein aktiver Mandant.",
      reasonCode: "MISSING_TENANT",
    };
  }

  if (actorUserId === targetUserId) {
    return {
      ok: false,
      status: 400,
      error: "Dieser Benutzer ist bereits aktiv.",
      reasonCode: "SELF_TARGET",
    };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      isActive: true,
      userRoles: {
        where: { role: { scope: "PLATFORM" } },
        select: { role: { select: { key: true, scope: true } } },
      },
    },
  });

  if (!targetUser?.isActive) {
    return {
      ok: false,
      status: 404,
      error: "Benutzer nicht gefunden oder inaktiv.",
      reasonCode: "TARGET_INACTIVE",
    };
  }

  const platformRoles = targetUser.userRoles.map((ur) => ur.role);
  if (userHasPlatformSystemIdentity(platformRoles)) {
    return {
      ok: false,
      status: 403,
      error: "Dieser Benutzer kann nicht imitiert werden.",
      reasonCode: "PLATFORM_TARGET",
    };
  }

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId,
      userId: targetUserId,
      isActive: true,
      tenant: { status: "ACTIVE" },
    },
    select: { id: true },
  });

  if (!membership) {
    return {
      ok: false,
      status: 404,
      error: "Benutzer ist kein aktives Mitglied dieses Vereins.",
      reasonCode: "CROSS_TENANT_OR_INACTIVE_MEMBERSHIP",
    };
  }

  return { ok: true, actorUserId, targetUserId, tenantId };
}
