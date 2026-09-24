import { PersonAssignmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { mergeSportingAssignmentTeamSeasonScopes } from "./assignment-team-season-scope";
import type {
  PersonalAssignmentRelationship,
  PersonalContext,
  PersonalOrgUnitRelationship,
  PersonalTeamRelationship,
  PersonalTeamRelationshipKind,
} from "./types";

export type ResolvePersonalContextInput = {
  tenantId: string;
  userId: string;
};

function mergeTeamRelationship(
  map: Map<string, PersonalTeamRelationship>,
  input: {
    teamId: string;
    teamName: string;
    kind: PersonalTeamRelationshipKind;
    functionKey?: string;
    teamSeasonId?: string;
  },
): void {
  const existing = map.get(input.teamId);
  if (!existing) {
    map.set(input.teamId, {
      teamId: input.teamId,
      teamName: input.teamName,
      kinds: [input.kind],
      assignmentFunctionKeys: input.functionKey ? [input.functionKey] : [],
      teamSeasonIds: input.teamSeasonId ? [input.teamSeasonId] : [],
    });
    return;
  }

  if (!existing.kinds.includes(input.kind)) {
    existing.kinds.push(input.kind);
  }
  if (input.functionKey && !existing.assignmentFunctionKeys.includes(input.functionKey)) {
    existing.assignmentFunctionKeys.push(input.functionKey);
  }
  if (input.teamSeasonId && !existing.teamSeasonIds.includes(input.teamSeasonId)) {
    existing.teamSeasonIds.push(input.teamSeasonId);
  }
  if (!existing.teamName && input.teamName) {
    existing.teamName = input.teamName;
  }
}

function mergeOrgRelationship(
  map: Map<string, PersonalOrgUnitRelationship>,
  input: {
    orgUnitId: string;
    orgUnitName: string;
    source: PersonalOrgUnitRelationship["sources"][number];
    functionKey?: string;
  },
): void {
  const existing = map.get(input.orgUnitId);
  if (!existing) {
    map.set(input.orgUnitId, {
      orgUnitId: input.orgUnitId,
      orgUnitName: input.orgUnitName,
      sources: [input.source],
      assignmentFunctionKeys: input.functionKey ? [input.functionKey] : [],
    });
    return;
  }

  if (!existing.sources.includes(input.source)) {
    existing.sources.push(input.source);
  }
  if (input.functionKey && !existing.assignmentFunctionKeys.includes(input.functionKey)) {
    existing.assignmentFunctionKeys.push(input.functionKey);
  }
}

/**
 * Resolves tenant-scoped personal relationships for dashboard relevance.
 * Does not evaluate resource visibility or permissions.
 */
export async function resolvePersonalContext(
  input: ResolvePersonalContextInput,
): Promise<PersonalContext> {
  const { tenantId, userId } = input;
  const now = new Date();
  const expiryFilter = { OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
  const activeOrgFilter = { orgUnit: { status: { not: "ARCHIVED" as const } } };

  const [membership, person] = await Promise.all([
    prisma.tenantMembership.findFirst({
      where: {
        tenantId,
        userId,
        isActive: true,
        user: { isActive: true },
        tenant: { status: "ACTIVE" },
      },
      select: { id: true },
    }),
    prisma.person.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    }),
  ]);

  const personId = person?.id ?? null;
  const hasLinkedPerson = Boolean(personId);

  if (!membership) {
    return {
      tenantId,
      userId,
      personId,
      hasLinkedPerson,
      hasActiveTenantMembership: false,
      teams: [],
      orgUnits: [],
      assignments: [],
    };
  }

  const [
    trainerRows,
    squadRows,
    assignmentRows,
    userOrgRows,
    personOrgRows,
  ] = await Promise.all([
    personId
      ? prisma.trainerTeamMember.findMany({
          where: {
            personId,
            status: "ACTIVE",
            teamSeason: { team: { tenantId } },
          },
          select: {
            teamSeason: {
              select: {
                id: true,
                teamId: true,
                team: { select: { name: true, shortName: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    personId
      ? prisma.playerSquadMember.findMany({
          where: {
            personId,
            status: "ACTIVE",
            teamSeason: { team: { tenantId } },
          },
          select: {
            teamSeason: {
              select: {
                id: true,
                teamId: true,
                team: { select: { name: true, shortName: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    personId
      ? prisma.personAssignment.findMany({
          where: {
            personId,
            tenantId,
            status: PersonAssignmentStatus.ACTIVE,
          },
          select: {
            id: true,
            orgUnitId: true,
            teamId: true,
            seasonId: true,
            functionKey: true,
            orgUnit: { select: { id: true, name: true } },
            team: { select: { id: true, name: true, shortName: true } },
          },
        })
      : Promise.resolve([]),
    prisma.orgUnitMembership.findMany({
      where: {
        userId,
        tenantId,
        status: "ACTIVE",
        ...expiryFilter,
        ...activeOrgFilter,
      },
      select: { orgUnitId: true, orgUnit: { select: { name: true } } },
    }),
    personId
      ? prisma.orgUnitMembership.findMany({
          where: {
            personId,
            tenantId,
            status: "ACTIVE",
            ...expiryFilter,
            ...activeOrgFilter,
          },
          select: { orgUnitId: true, orgUnit: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const teamMap = new Map<string, PersonalTeamRelationship>();
  const orgMap = new Map<string, PersonalOrgUnitRelationship>();
  const assignments: PersonalAssignmentRelationship[] = [];

  for (const row of trainerRows) {
    const teamId = row.teamSeason.teamId;
    const team = row.teamSeason.team;
    const teamName = team?.shortName?.trim() || team?.name || "Team";
    mergeTeamRelationship(teamMap, {
      teamId,
      teamName,
      kind: "TRAINER",
      teamSeasonId: row.teamSeason.id,
    });
  }

  for (const row of squadRows) {
    const teamId = row.teamSeason.teamId;
    const team = row.teamSeason.team;
    const teamName = team?.shortName?.trim() || team?.name || "Team";
    mergeTeamRelationship(teamMap, {
      teamId,
      teamName,
      kind: "PLAYER",
      teamSeasonId: row.teamSeason.id,
    });
  }

  for (const row of assignmentRows) {
    assignments.push({
      assignmentId: row.id,
      orgUnitId: row.orgUnitId,
      orgUnitName: row.orgUnit.name,
      teamId: row.teamId,
      teamName: row.team?.shortName?.trim() || row.team?.name || null,
      functionKey: row.functionKey,
    });

    mergeOrgRelationship(orgMap, {
      orgUnitId: row.orgUnitId,
      orgUnitName: row.orgUnit.name,
      source: "PERSON_ASSIGNMENT",
      functionKey: row.functionKey,
    });

    if (row.teamId) {
      const teamName =
        row.team?.shortName?.trim() || row.team?.name || "Team";
      mergeTeamRelationship(teamMap, {
        teamId: row.teamId,
        teamName,
        kind: "PERSON_ASSIGNMENT",
        functionKey: row.functionKey,
      });
    }
  }

  for (const row of userOrgRows) {
    mergeOrgRelationship(orgMap, {
      orgUnitId: row.orgUnitId,
      orgUnitName: row.orgUnit.name,
      source: "USER_MEMBERSHIP",
    });
  }

  for (const row of personOrgRows) {
    mergeOrgRelationship(orgMap, {
      orgUnitId: row.orgUnitId,
      orgUnitName: row.orgUnit.name,
      source: "PERSON_MEMBERSHIP",
    });
  }

  const teamNameByTeamId = new Map<string, string>();
  for (const row of assignmentRows) {
    if (row.teamId) {
      const teamName = row.team?.shortName?.trim() || row.team?.name || "Team";
      teamNameByTeamId.set(row.teamId, teamName);
    }
  }

  await mergeSportingAssignmentTeamSeasonScopes({
    tenantId,
    assignmentRows,
    teamNameByTeamId,
    mergeTeamRelationship: (input) => mergeTeamRelationship(teamMap, input),
  });

  const teams = Array.from(teamMap.values()).sort((a, b) =>
    a.teamName.localeCompare(b.teamName),
  );
  const orgUnits = Array.from(orgMap.values()).sort((a, b) =>
    a.orgUnitName.localeCompare(b.orgUnitName),
  );

  return {
    tenantId,
    userId,
    personId,
    hasLinkedPerson,
    hasActiveTenantMembership: true,
    teams,
    orgUnits,
    assignments,
  };
}

/** Backwards-compatible alias for implementation plan naming. */
export const resolvePersonalDashboardContext = resolvePersonalContext;
