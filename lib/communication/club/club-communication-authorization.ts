/**
 * SCE-COMM-11 — Club communication authorization (separate from Zielgruppe membership).
 */

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import {
  isPlatformSuperAdmin,
  isTenantClubAdmin,
} from "@/lib/teams/team-document-auth";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

export type ClubCommunicationAuthorization = {
  tenantId: string;
  tenantKey: string;
  userId: string;
  canView: boolean;
  canSend: boolean;
  canViewEngagementDetail: boolean;
  canManageDrafts: boolean;
};

export async function resolveClubCommunicationAuthorization(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
}): Promise<ClubCommunicationAuthorization> {
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

  const canView =
    isSuperAdmin ||
    isClubAdmin ||
    has(PERMISSIONS.COMMUNICATION_CLUB_VIEW) ||
    has(PERMISSIONS.COMMUNICATION_CLUB_SEND) ||
    has(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE);

  const canSend =
    isSuperAdmin ||
    isClubAdmin ||
    has(PERMISSIONS.COMMUNICATION_CLUB_SEND);

  const canViewEngagementDetail =
    isSuperAdmin ||
    isClubAdmin ||
    has(PERMISSIONS.COMMUNICATION_CLUB_ENGAGEMENT_DETAIL) ||
    has(PERMISSIONS.COMMUNICATION_CLUB_SEND);

  const canManageDrafts = canSend;

  return {
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
    canView,
    canSend,
    canViewEngagementDetail,
    canManageDrafts,
  };
}

export async function requireClubCommunicationView(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
}): Promise<ClubCommunicationAuthorization> {
  const auth = await resolveClubCommunicationAuthorization(input);
  if (!auth.canView) {
    throw new TeamCommunicationForbiddenError("CLUB_COMMUNICATION_VIEW_DENIED");
  }
  return auth;
}

export async function requireClubCommunicationSend(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
}): Promise<ClubCommunicationAuthorization> {
  const auth = await resolveClubCommunicationAuthorization(input);
  if (!auth.canSend) {
    throw new TeamCommunicationForbiddenError("CLUB_COMMUNICATION_SEND_DENIED");
  }
  return auth;
}

export async function requireClubCommunicationEngagementDetail(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
}): Promise<ClubCommunicationAuthorization> {
  const auth = await resolveClubCommunicationAuthorization(input);
  if (!auth.canViewEngagementDetail) {
    throw new TeamCommunicationForbiddenError("CLUB_COMMUNICATION_ENGAGEMENT_DETAIL_DENIED");
  }
  return auth;
}
