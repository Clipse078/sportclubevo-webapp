import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import {
  isPlatformSuperAdmin,
  isTenantClubAdmin,
} from "@/lib/teams/team-document-auth";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

export async function resolvePlatformTemplateAuthorization(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
}): Promise<{ canView: boolean; canManage: boolean }> {
  const resolver = createEffectivePermissionResolver(prisma);
  const { tenant: tenantPermissions } = await resolver.getEffectivePermissions({
    userId: input.userId,
    tenantId: input.tenantId,
  });
  const has = (key: string) => tenantPermissions.includes(key);

  const [isSuperAdmin, isClubAdmin] = await Promise.all([
    isPlatformSuperAdmin(input.userId),
    isTenantClubAdmin(input.userId, input.tenantId, input.tenantKey),
  ]);

  const canManage =
    isSuperAdmin ||
    isClubAdmin ||
    has(PERMISSIONS.COMMUNICATION_TEMPLATES_MANAGE);
  const canView =
    canManage || isSuperAdmin || isClubAdmin || has(PERMISSIONS.COMMUNICATION_TEMPLATES_VIEW);

  return { canView, canManage };
}

export async function requirePlatformTemplateView(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
}): Promise<void> {
  const authz = await resolvePlatformTemplateAuthorization(input);
  if (!authz.canView) {
    throw new TeamCommunicationForbiddenError();
  }
}

export async function requirePlatformTemplateManage(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
}): Promise<void> {
  const authz = await resolvePlatformTemplateAuthorization(input);
  if (!authz.canManage) {
    throw new TeamCommunicationForbiddenError();
  }
}
