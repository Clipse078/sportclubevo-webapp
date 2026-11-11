import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireApiTenantPermissionContext } from "@/lib/permissions/require-api-tenant-context";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { prisma } from "@/lib/db/prisma";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { userHasVereinsleitungWorkspaceAccess } from "@/lib/permissions/vereinsleitung-workspace-access";
import { isPlatformSuperAdmin } from "@/lib/security/platform-superadmin";

export type StrategicApiContext = {
  tenantId: string;
  actorUserId: string;
  actor: ActorContext;
};

export type StrategicApiContextResult =
  | { ok: true; context: StrategicApiContext }
  | { ok: false; response: NextResponse };

export async function resolveLiveTenantActor(
  tenantId: string,
  actorUserId: string,
): Promise<ActorContext | null> {
  const [membership, isSuperAdmin, hasVereinsleitungAccess] = await Promise.all([
    prisma.tenantMembership.findFirst({
      where: {
        tenantId,
        userId: actorUserId,
        isActive: true,
        user: { isActive: true },
        tenant: { status: "ACTIVE" },
      },
      select: { id: true },
    }),
    isPlatformSuperAdmin(prisma, actorUserId),
    userHasVereinsleitungWorkspaceAccess(actorUserId, tenantId),
  ]);

  if (!hasVereinsleitungAccess) return null;
  if (!membership && !isSuperAdmin) return null;

  const [effective, assignments] = await Promise.all([
    createEffectivePermissionResolver(prisma).getEffectivePermissions({
      userId: actorUserId,
      tenantId,
    }),
    prisma.userRole.findMany({
      where: {
        userId: actorUserId,
        tenantId,
        role: { scope: "TENANT", tenantId, isArchived: false },
      },
      select: { role: { select: { key: true } } },
    }),
  ]);

  return getActorContext(
    {
      id: actorUserId,
      roleKeys: assignments.map((assignment) => assignment.role.key),
      permissionKeys: [...effective.platform, ...effective.tenant],
    },
    tenantId,
  );
}

async function resolveStrategicActorForSuperAdmin(
  tenantId: string,
  actorUserId: string,
): Promise<ActorContext | null> {
  const [effective, platformAssignments, tenantAssignments] = await Promise.all([
    createEffectivePermissionResolver(prisma).getEffectivePermissions({
      userId: actorUserId,
      tenantId,
    }),
    prisma.userRole.findMany({
      where: {
        userId: actorUserId,
        tenantId: null,
        role: { scope: "PLATFORM", tenantId: null, isArchived: false },
      },
      select: { role: { select: { key: true } } },
    }),
    prisma.userRole.findMany({
      where: {
        userId: actorUserId,
        tenantId,
        role: { scope: "TENANT", tenantId, isArchived: false },
      },
      select: { role: { select: { key: true } } },
    }),
  ]);

  return getActorContext(
    {
      id: actorUserId,
      roleKeys: [
        ...platformAssignments.map((assignment) => assignment.role.key),
        ...tenantAssignments.map((assignment) => assignment.role.key),
      ],
      permissionKeys: [...effective.platform, ...effective.tenant],
    },
    tenantId,
  );
}

export async function requireStrategicApiContext(
  permissions: readonly PermissionKey[],
): Promise<StrategicApiContextResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const tenantId = session.user.activeTenantId;
  const actorUserId = session.user.effectiveUserId ?? session.user.id;
  if (!tenantId || !actorUserId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const hasVereinsleitungAccess = await userHasVereinsleitungWorkspaceAccess(
    actorUserId,
    tenantId,
  );
  if (!hasVereinsleitungAccess) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const isSuperAdmin = await isPlatformSuperAdmin(prisma, actorUserId);

  if (isSuperAdmin) {
    const actor = await resolveStrategicActorForSuperAdmin(tenantId, actorUserId);
    if (!actor) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
    return { ok: true, context: { tenantId, actorUserId, actor } };
  }

  const access = await requireApiTenantPermissionContext(permissions);
  if (!access.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: access.error },
        { status: access.status },
      ),
    };
  }

  const { roleKeys, permissionKeys } = access.context;

  const actor = await getActorContext(
    { id: actorUserId, roleKeys, permissionKeys },
    tenantId,
  );

  return { ok: true, context: { tenantId, actorUserId, actor } };
}
