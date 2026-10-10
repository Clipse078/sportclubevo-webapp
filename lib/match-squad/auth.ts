/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01A — centralized squad authorization.
 */

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import {
  isPlatformSuperAdmin,
  isTenantClubAdmin,
  resolvePersonIdForUser,
} from "@/lib/teams/team-document-auth";
import { MatchSquadForbiddenError } from "@/lib/match-squad/errors";

export type MatchSquadAccess = {
  userId: string;
  tenantId: string;
  tenantKey: string;
  teamId: string;
  teamSeasonId: string;
  canView: boolean;
  canEdit: boolean;
};

export async function resolveMatchSquadAccess(input: {
  userId: string;
  tenantId: string;
  tenantKey: string;
  teamId: string;
  teamSeasonId: string;
}): Promise<MatchSquadAccess | null> {
  const team = await prisma.team.findFirst({
    where: { id: input.teamId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!team) return null;

  const teamSeason = await prisma.teamSeason.findFirst({
    where: {
      id: input.teamSeasonId,
      teamId: input.teamId,
      team: { tenantId: input.tenantId },
    },
    select: { id: true },
  });
  if (!teamSeason) return null;

  const effectiveResolver = createEffectivePermissionResolver(prisma);
  const [isSuperAdmin, isClubAdmin, personId, hasEventsView, hasEventsManage, hasTeamsManage] =
    await Promise.all([
      isPlatformSuperAdmin(input.userId),
      isTenantClubAdmin(input.userId, input.tenantId, input.tenantKey),
      resolvePersonIdForUser(input.userId, input.tenantId),
      effectiveResolver.hasPermission({
        userId: input.userId,
        tenantId: input.tenantId,
        permission: PERMISSIONS.EVENTS_VIEW,
      }),
      effectiveResolver.hasPermission({
        userId: input.userId,
        tenantId: input.tenantId,
        permission: PERMISSIONS.EVENTS_MANAGE,
      }),
      effectiveResolver.hasPermission({
        userId: input.userId,
        tenantId: input.tenantId,
        permission: PERMISSIONS.TEAMS_MANAGE,
      }),
    ]);

  let isActiveTrainerOnTeamSeason = false;
  if (personId) {
    const trainer = await prisma.trainerTeamMember.findFirst({
      where: {
        teamSeasonId: input.teamSeasonId,
        personId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    isActiveTrainerOnTeamSeason = Boolean(trainer);
  }

  const canView =
    isSuperAdmin ||
    isClubAdmin ||
    hasEventsView ||
    hasEventsManage ||
    hasTeamsManage ||
    isActiveTrainerOnTeamSeason;

  const canEdit =
    isSuperAdmin ||
    isClubAdmin ||
    hasEventsManage ||
    hasTeamsManage ||
    isActiveTrainerOnTeamSeason;

  if (!canView) return null;

  return {
    userId: input.userId,
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    teamId: input.teamId,
    teamSeasonId: input.teamSeasonId,
    canView,
    canEdit,
  };
}

export function assertMatchSquadMutationAllowed(access: MatchSquadAccess): void {
  if (!access.canEdit) {
    throw new MatchSquadForbiddenError();
  }
}
