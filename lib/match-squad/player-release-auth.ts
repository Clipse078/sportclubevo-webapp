/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01C — Spielerfreigabe authorization.
 */

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import {
  isPlatformSuperAdmin,
  isTenantClubAdmin,
  resolvePersonIdForUser,
} from "@/lib/teams/team-document-auth";

export type PlayerReleaseAccess = {
  userId: string;
  tenantId: string;
  tenantKey: string;
  teamId: string;
  teamSeasonId: string;
  canViewSource: boolean;
  canManageSource: boolean;
  canViewAsTarget: boolean;
};

async function resolveTrainerOnTeamSeason(
  personId: string | null,
  teamSeasonId: string,
): Promise<boolean> {
  if (!personId) return false;
  const trainer = await prisma.trainerTeamMember.findFirst({
    where: { teamSeasonId, personId, status: "ACTIVE" },
    select: { id: true },
  });
  return Boolean(trainer);
}

export async function resolvePlayerReleaseAccess(input: {
  userId: string;
  tenantId: string;
  tenantKey: string;
  teamId: string;
  teamSeasonId: string;
}): Promise<PlayerReleaseAccess | null> {
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

  const isSourceTrainer = await resolveTrainerOnTeamSeason(personId, input.teamSeasonId);

  const canViewSource =
    isSuperAdmin ||
    isClubAdmin ||
    hasEventsView ||
    hasEventsManage ||
    hasTeamsManage ||
    isSourceTrainer;

  const canManageSource =
    isSuperAdmin || isClubAdmin || hasEventsManage || hasTeamsManage || isSourceTrainer;

  if (!canViewSource && !canManageSource) {
    return null;
  }

  return {
    userId: input.userId,
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    teamId: input.teamId,
    teamSeasonId: input.teamSeasonId,
    canViewSource,
    canManageSource,
    canViewAsTarget: false,
  };
}

export async function resolvePlayerReleaseTargetViewAccess(input: {
  userId: string;
  tenantId: string;
  tenantKey: string;
  targetTeamSeasonId: string;
}): Promise<boolean> {
  const target = await prisma.teamSeason.findFirst({
    where: {
      id: input.targetTeamSeasonId,
      team: { tenantId: input.tenantId },
    },
    select: { id: true, teamId: true },
  });
  if (!target) return false;

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

  if (isSuperAdmin || isClubAdmin || hasEventsView || hasEventsManage || hasTeamsManage) {
    return true;
  }

  return resolveTrainerOnTeamSeason(personId, target.id);
}
