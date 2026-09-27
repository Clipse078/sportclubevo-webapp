/**
 * SCE-COMM-13 — Sponsor-domain read authorization (separate from communication send).
 */

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import {
  isPlatformSuperAdmin,
  isTenantClubAdmin,
} from "@/lib/teams/team-document-auth";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

export type SponsorAudienceAuthorization = {
  canViewSponsorData: boolean;
  canSelectSponsorAudience: boolean;
};

export async function resolveSponsorAudienceAuthorization(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
}): Promise<SponsorAudienceAuthorization> {
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

  const canViewSponsorData =
    isSuperAdmin ||
    isClubAdmin ||
    has(PERMISSIONS.SPONSORING_VIEW) ||
    has(PERMISSIONS.SPONSORING_MANAGE);

  return {
    canViewSponsorData,
    canSelectSponsorAudience: canViewSponsorData,
  };
}

export async function requireSponsorAudienceSelect(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
}): Promise<SponsorAudienceAuthorization> {
  const auth = await resolveSponsorAudienceAuthorization(input);
  if (!auth.canSelectSponsorAudience) {
    throw new TeamCommunicationForbiddenError("SPONSOR_AUDIENCE_SELECT_DENIED");
  }
  return auth;
}
