/**
 * SCE-COMM-04 — Team communication authorization (separate from team membership).
 */

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import {
  isPlatformSuperAdmin,
  isTenantClubAdmin,
  resolvePersonCurrentTeamAllocation,
  resolvePersonIdForUser,
} from "@/lib/teams/team-document-auth";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

export type TeamCommunicationAuthorization = {
  tenantId: string;
  tenantKey: string;
  userId: string;
  teamId: string;
  canView: boolean;
  canSend: boolean;
};

export type ResolveTeamCommunicationAuthorizationInput = {
  tenantId: string;
  tenantKey: string;
  userId: string;
  teamId: string;
};

export async function resolveTeamCommunicationAuthorization(
  input: ResolveTeamCommunicationAuthorizationInput,
): Promise<TeamCommunicationAuthorization | null> {
  const team = await prisma.team.findFirst({
    where: { id: input.teamId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!team) return null;

  const resolver = createEffectivePermissionResolver(prisma);
  const { tenant: tenantPermissions } = await resolver.getEffectivePermissions({
    userId: input.userId,
    tenantId: input.tenantId,
  });

  const has = (key: string) => tenantPermissions.includes(key);

  const [isSuperAdmin, isClubAdmin, personId] = await Promise.all([
    isPlatformSuperAdmin(input.userId),
    isTenantClubAdmin(input.userId, input.tenantId, input.tenantKey),
    resolvePersonIdForUser(input.userId, input.tenantId),
  ]);

  const allocation = personId
    ? await resolvePersonCurrentTeamAllocation(personId, input.teamId)
    : { isAllocated: false, isPlayer: false, isTrainer: false };

  const orgCommAdmin =
    has(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE) ||
    has(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW);

  const canView =
    isSuperAdmin ||
    isClubAdmin ||
    has(PERMISSIONS.COMMUNICATION_TEAM_VIEW) ||
    has(PERMISSIONS.COMMUNICATION_TEAM_SEND) ||
    orgCommAdmin ||
    has(PERMISSIONS.TEAMS_MANAGE) ||
    allocation.isAllocated;

  const canSend =
    isSuperAdmin ||
    isClubAdmin ||
    has(PERMISSIONS.COMMUNICATION_TEAM_SEND) ||
    has(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE) ||
    has(PERMISSIONS.TEAMS_MANAGE) ||
    allocation.isTrainer;

  return {
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
    teamId: input.teamId,
    canView,
    canSend,
  };
}

export async function requireTeamCommunicationView(
  input: ResolveTeamCommunicationAuthorizationInput,
): Promise<TeamCommunicationAuthorization> {
  const auth = await resolveTeamCommunicationAuthorization(input);
  if (!auth?.canView) {
    throw new TeamCommunicationForbiddenError("TEAM_COMMUNICATION_VIEW_DENIED");
  }
  return auth;
}

export async function requireTeamCommunicationSend(
  input: ResolveTeamCommunicationAuthorizationInput,
): Promise<TeamCommunicationAuthorization> {
  const auth = await resolveTeamCommunicationAuthorization(input);
  if (!auth?.canSend) {
    throw new TeamCommunicationForbiddenError("TEAM_COMMUNICATION_SEND_DENIED");
  }
  return auth;
}
