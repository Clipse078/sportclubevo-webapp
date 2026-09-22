/**
 * AUFGABEN-06G6 — canonical Person-id resolvers for organisational audience selectors.
 * Server-only; tenant-scoped and fail-closed on foreign references.
 */

import { prisma } from "@/lib/db/prisma";
import { resolveTargetGroup } from "@/lib/org/target-group-resolver";

function dedupePersonIds(personIds: readonly string[]): string[] {
  return [...new Set(personIds.map((id) => id.trim()).filter(Boolean))];
}

export async function mapTenantPersonIdsForUsers(
  tenantId: string,
  userIds: readonly string[],
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await prisma.person.findMany({
    where: {
      tenantId,
      userId: { in: [...userIds] },
      isActive: true,
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function resolveTeamAudiencePersonIds(
  tenantId: string,
  teamIds: readonly string[],
): Promise<string[]> {
  const uniqueTeamIds = dedupePersonIds(teamIds);
  if (uniqueTeamIds.length === 0) return [];

  const teams = await prisma.team.findMany({
    where: { id: { in: uniqueTeamIds } },
    select: { id: true, tenantId: true },
  });
  if (teams.length !== uniqueTeamIds.length) {
    throw new Error("INVALID_TEAM_AUDIENCE");
  }
  for (const team of teams) {
    if (team.tenantId !== tenantId) {
      throw new Error("INVALID_TEAM_AUDIENCE");
    }
  }

  const teamSeasons = await prisma.teamSeason.findMany({
    where: {
      teamId: { in: uniqueTeamIds },
      status: "ACTIVE",
    },
    select: {
      playerSquadMembers: {
        where: { status: "ACTIVE" },
        select: { person: { select: { id: true, isActive: true, tenantId: true } } },
      },
      trainerTeamMembers: {
        where: { status: "ACTIVE" },
        select: { person: { select: { id: true, isActive: true, tenantId: true } } },
      },
    },
  });

  const personIds: string[] = [];
  for (const ts of teamSeasons) {
    for (const row of ts.playerSquadMembers) {
      if (row.person.isActive && row.person.tenantId === tenantId) {
        personIds.push(row.person.id);
      }
    }
    for (const row of ts.trainerTeamMembers) {
      if (row.person.isActive && row.person.tenantId === tenantId) {
        personIds.push(row.person.id);
      }
    }
  }
  return dedupePersonIds(personIds);
}

export async function resolveOrgUnitAudiencePersonIds(
  tenantId: string,
  orgUnitIds: readonly string[],
  now: Date = new Date(),
): Promise<string[]> {
  const uniqueOrgUnitIds = dedupePersonIds(orgUnitIds);
  if (uniqueOrgUnitIds.length === 0) return [];

  const orgUnits = await prisma.orgUnit.findMany({
    where: { id: { in: uniqueOrgUnitIds } },
    select: { id: true, tenantId: true, archivedAt: true, status: true },
  });
  if (orgUnits.length !== uniqueOrgUnitIds.length) {
    throw new Error("INVALID_ORG_UNIT_AUDIENCE");
  }
  for (const orgUnit of orgUnits) {
    if (orgUnit.tenantId !== tenantId || orgUnit.archivedAt != null || orgUnit.status !== "ACTIVE") {
      throw new Error("INVALID_ORG_UNIT_AUDIENCE");
    }
  }

  const memberships = await prisma.orgUnitMembership.findMany({
    where: {
      orgUnitId: { in: uniqueOrgUnitIds },
      tenantId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    select: { personId: true, userId: true },
  });

  const directPersonIds = memberships
    .map((m) => m.personId)
    .filter((id): id is string => Boolean(id));
  const userIds = memberships
    .map((m) => m.userId)
    .filter((id): id is string => Boolean(id));

  const linkedPersonIds = await mapTenantPersonIdsForUsers(tenantId, userIds);
  return dedupePersonIds([...directPersonIds, ...linkedPersonIds]);
}

export async function resolveRoleAudiencePersonIds(
  tenantId: string,
  roleIds: readonly string[],
): Promise<string[]> {
  const uniqueRoleIds = dedupePersonIds(roleIds);
  if (uniqueRoleIds.length === 0) return [];

  const roles = await prisma.role.findMany({
    where: { id: { in: uniqueRoleIds } },
    select: { id: true, tenantId: true, scope: true },
  });
  if (roles.length !== uniqueRoleIds.length) {
    throw new Error("INVALID_ROLE_AUDIENCE");
  }
  for (const role of roles) {
    if (role.scope !== "TENANT" || role.tenantId !== tenantId) {
      throw new Error("INVALID_ROLE_AUDIENCE");
    }
  }

  const userRoles = await prisma.userRole.findMany({
    where: {
      roleId: { in: uniqueRoleIds },
      tenantId,
    },
    select: { userId: true, user: { select: { isActive: true } } },
  });

  const activeUserIds = userRoles
    .filter((ur) => ur.user.isActive)
    .map((ur) => ur.userId);

  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId, userId: { in: activeUserIds }, isActive: true },
    select: { userId: true },
  });
  const allowedUserIds = new Set(memberships.map((m) => m.userId));
  const tenantUserIds = activeUserIds.filter((id) => allowedUserIds.has(id));

  return mapTenantPersonIdsForUsers(tenantId, tenantUserIds);
}

export async function resolveTargetGroupAudiencePersonIds(
  tenantId: string,
  targetGroupIds: readonly string[],
): Promise<string[]> {
  const uniqueTargetGroupIds = dedupePersonIds(targetGroupIds);
  if (uniqueTargetGroupIds.length === 0) return [];

  const groups = await prisma.targetGroup.findMany({
    where: { id: { in: uniqueTargetGroupIds } },
    select: { id: true, tenantId: true, status: true },
  });
  if (groups.length !== uniqueTargetGroupIds.length) {
    throw new Error("INVALID_TARGET_GROUP_AUDIENCE");
  }
  for (const group of groups) {
    if (group.tenantId !== tenantId || group.status === "ARCHIVED") {
      throw new Error("INVALID_TARGET_GROUP_AUDIENCE");
    }
  }

  const personIds: string[] = [];
  for (const targetGroupId of uniqueTargetGroupIds) {
    const resolved = await resolveTargetGroup(targetGroupId, tenantId);
    if (!resolved) {
      throw new Error("INVALID_TARGET_GROUP_AUDIENCE");
    }
    personIds.push(...resolved.personIds);
    const userOnlyIds = resolved.members
      .filter((m) => m.userId && !m.personId)
      .map((m) => m.userId!);
    personIds.push(...(await mapTenantPersonIdsForUsers(tenantId, userOnlyIds)));
  }
  return dedupePersonIds(personIds);
}
