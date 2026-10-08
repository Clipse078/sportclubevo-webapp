import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import type { PermissionKey } from "@/lib/permissions/permissions";

/**
 * Tenant-scoped authorization for the REAL authenticated actor (JWT `sub`).
 *
 * Use for privileged operations that must never inherit impersonated effective
 * permissions — e.g. starting tenant impersonation.
 */
export async function requireApiActorTenantPermission(permissionKey: PermissionKey) {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false as const,
      status: 401,
      error: "Unauthorized",
      session: null,
      actorUserId: null as string | null,
    };
  }

  if (session.user.isImpersonating) {
    return {
      ok: false as const,
      status: 403,
      error: "Forbidden",
      session,
      actorUserId: null as string | null,
    };
  }

  const actorUserId = session.user.actorUserId ?? session.user.id;
  const actorTenantId = session.user.activeTenantId;

  if (
    !actorUserId ||
    session.user.effectiveUserId !== actorUserId ||
    !actorTenantId
  ) {
    return {
      ok: false as const,
      status: 403,
      error: "Forbidden",
      session,
      actorUserId: null as string | null,
    };
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { isActive: true },
  });
  if (!actor?.isActive) {
    return {
      ok: false as const,
      status: 403,
      error: "Forbidden",
      session,
      actorUserId: null as string | null,
    };
  }

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: actorTenantId,
      userId: actorUserId,
      isActive: true,
      tenant: { status: "ACTIVE" },
    },
    select: { id: true },
  });
  if (!membership) {
    return {
      ok: false as const,
      status: 403,
      error: "Forbidden",
      session,
      actorUserId: null as string | null,
    };
  }

  const resolver = createEffectivePermissionResolver(prisma);
  const allowed = await resolver.hasPermission({
    userId: actorUserId,
    permission: permissionKey,
    tenantId: actorTenantId,
  });

  if (!allowed) {
    return {
      ok: false as const,
      status: 403,
      error: "Forbidden",
      session,
      actorUserId: null as string | null,
    };
  }

  return {
    ok: true as const,
    status: 200,
    error: null,
    session,
    actorUserId,
  };
}
