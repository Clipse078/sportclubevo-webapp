import { prisma } from "@/lib/db/prisma";
import { notifyPersonalDashboardDomainMutation } from "./invalidate";

async function filterActiveTenantUserIds(
  tenantId: string,
  userIds: readonly string[],
): Promise<string[]> {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const memberships = await prisma.tenantMembership.findMany({
    where: {
      tenantId,
      userId: { in: unique },
      isActive: true,
      user: { isActive: true },
      tenant: { status: "ACTIVE" },
    },
    select: { userId: true },
  });

  return memberships.map((row) => row.userId);
}

export async function listActiveDashboardUserIdsForPersonIds(
  tenantId: string,
  personIds: readonly string[],
): Promise<string[]> {
  const uniquePersonIds = [...new Set(personIds.map((id) => id.trim()).filter(Boolean))];
  if (uniquePersonIds.length === 0) return [];

  const persons = await prisma.person.findMany({
    where: { tenantId, id: { in: uniquePersonIds } },
    select: { userId: true },
  });

  const userIds = persons
    .map((row) => row.userId)
    .filter((userId): userId is string => Boolean(userId?.trim()));

  return filterActiveTenantUserIds(tenantId, userIds);
}

/**
 * Users whose personal programme can include training/matches for this TeamSeason.
 */
export async function listActiveDashboardUserIdsForTeamSeason(
  tenantId: string,
  teamSeasonId: string,
): Promise<string[]> {
  const trimmed = teamSeasonId.trim();
  if (!trimmed) return [];

  const teamSeason = await prisma.teamSeason.findFirst({
    where: { id: trimmed, team: { tenantId } },
    select: { id: true },
  });
  if (!teamSeason) return [];

  const [squadRows, trainerRows] = await Promise.all([
    prisma.playerSquadMember.findMany({
      where: {
        teamSeasonId: trimmed,
        status: "ACTIVE",
        person: { tenantId, isActive: true },
      },
      select: { person: { select: { userId: true } } },
    }),
    prisma.trainerTeamMember.findMany({
      where: {
        teamSeasonId: trimmed,
        status: "ACTIVE",
        person: { tenantId, isActive: true },
      },
      select: { person: { select: { userId: true } } },
    }),
  ]);

  const userIds = [...squadRows, ...trainerRows]
    .map((row) => row.person.userId)
    .filter((userId): userId is string => Boolean(userId?.trim()));

  return filterActiveTenantUserIds(tenantId, userIds);
}

export async function notifyPersonalDashboardUsers(
  tenantId: string,
  userIds: readonly string[],
): Promise<void> {
  const activeUserIds = await filterActiveTenantUserIds(tenantId, userIds);
  await Promise.all(
    activeUserIds.map((userId) =>
      notifyPersonalDashboardDomainMutation({ tenantId, userId }),
    ),
  );
}

export async function notifyPersonalDashboardForPersonIds(
  tenantId: string,
  personIds: readonly string[],
): Promise<void> {
  const userIds = await listActiveDashboardUserIdsForPersonIds(tenantId, personIds);
  await notifyPersonalDashboardUsers(tenantId, userIds);
}

export async function notifyPersonalDashboardForTeamSeason(
  tenantId: string,
  teamSeasonId: string,
): Promise<void> {
  const userIds = await listActiveDashboardUserIdsForTeamSeason(tenantId, teamSeasonId);
  await notifyPersonalDashboardUsers(tenantId, userIds);
}

export async function notifyPersonalDashboardForTrainingSession(
  tenantId: string,
  sessionId: string,
): Promise<void> {
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId.trim(), tenantId },
    select: { teamSeasonId: true },
  });
  if (!session?.teamSeasonId) return;
  await notifyPersonalDashboardForTeamSeason(tenantId, session.teamSeasonId);
}

export async function notifyPersonalDashboardForSportingEvent(
  tenantId: string,
  eventId: string,
): Promise<void> {
  const event = await prisma.event.findFirst({
    where: { id: eventId.trim(), tenantId },
    select: { teamSeasonId: true, teamId: true, type: true },
  });
  if (!event) return;

  if (event.teamSeasonId) {
    await notifyPersonalDashboardForTeamSeason(tenantId, event.teamSeasonId);
    return;
  }

  if (!event.teamId) return;

  const teamSeasons = await prisma.teamSeason.findMany({
    where: { teamId: event.teamId, team: { tenantId } },
    select: { id: true },
  });
  await Promise.all(
    teamSeasons.map((row) => notifyPersonalDashboardForTeamSeason(tenantId, row.id)),
  );
}

export async function notifyPersonalDashboardForClubEventAudience(
  tenantId: string,
  eventId: string,
): Promise<void> {
  const entries = await prisma.eventParticipationAudienceEntry.findMany({
    where: { tenantId, eventId: eventId.trim() },
    select: {
      kind: true,
      personId: true,
      teamId: true,
      orgUnitId: true,
      roleId: true,
    },
  });

  if (entries.length === 0) {
    return;
  }

  const personIds = new Set<string>();
  const teamIds = new Set<string>();
  const orgUnitIds = new Set<string>();
  const roleIds = new Set<string>();

  for (const entry of entries) {
    if (entry.kind === "PERSON" && entry.personId) personIds.add(entry.personId);
    if (entry.kind === "TEAM" && entry.teamId) teamIds.add(entry.teamId);
    if (entry.kind === "ORG_UNIT" && entry.orgUnitId) orgUnitIds.add(entry.orgUnitId);
    if (entry.kind === "ROLE" && entry.roleId) roleIds.add(entry.roleId);
  }

  const {
    resolveTeamAudiencePersonIds,
    resolveOrgUnitAudiencePersonIds,
    resolveRoleAudiencePersonIds,
  } = await import("@/lib/requirements/requirement-audience-resolvers");

  const [fromTeams, fromOrgUnits, fromRoles] = await Promise.all([
    resolveTeamAudiencePersonIds(tenantId, [...teamIds]),
    resolveOrgUnitAudiencePersonIds(tenantId, [...orgUnitIds]),
    resolveRoleAudiencePersonIds(tenantId, [...roleIds]),
  ]);

  for (const id of fromTeams) personIds.add(id);
  for (const id of fromOrgUnits) personIds.add(id);
  for (const id of fromRoles) personIds.add(id);

  await notifyPersonalDashboardForPersonIds(tenantId, [...personIds]);
}
