/**
 * WORKSPACE-02 — dynamic organisational membership for ACL audience matching.
 */

import { PersonAssignmentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type WorkspaceRoleAssignment = {
  functionKey: string;
  orgUnitId: string;
  teamId: string | null;
};

export type WorkspaceActorMembership = {
  tenantId: string;
  personId: string | null;
  orgUnitIds: ReadonlySet<string>;
  teamIds: ReadonlySet<string>;
  roleAssignments: readonly WorkspaceRoleAssignment[];
};

const EMPTY_MEMBERSHIP = Object.freeze({
  orgUnitIds: new Set<string>(),
  teamIds: new Set<string>(),
  roleAssignments: [] as WorkspaceRoleAssignment[],
});

export async function loadWorkspaceActorMembership(
  tenantId: string,
  personId: string | null,
): Promise<WorkspaceActorMembership> {
  if (!personId) {
    return {
      tenantId,
      personId: null,
      ...EMPTY_MEMBERSHIP,
    };
  }

  const person = await prisma.person.findFirst({
    where: { id: personId, tenantId },
    select: { id: true },
  });

  if (!person) {
    return {
      tenantId,
      personId: null,
      ...EMPTY_MEMBERSHIP,
    };
  }

  const now = new Date();

  const [orgUnitRows, assignmentRows, squadRows, trainerRows] =
    await Promise.all([
      prisma.orgUnitMembership.findMany({
        where: {
          tenantId,
          personId,
          status: "ACTIVE",
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        select: { orgUnitId: true },
      }),
      prisma.personAssignment.findMany({
        where: {
          tenantId,
          personId,
          status: PersonAssignmentStatus.ACTIVE,
        },
        select: {
          functionKey: true,
          orgUnitId: true,
          teamId: true,
        },
      }),
      prisma.playerSquadMember.findMany({
        where: {
          personId,
          status: "ACTIVE",
          teamSeason: { team: { tenantId } },
        },
        select: {
          teamSeason: { select: { teamId: true } },
        },
      }),
      prisma.trainerTeamMember.findMany({
        where: {
          personId,
          status: "ACTIVE",
          teamSeason: { team: { tenantId } },
        },
        select: {
          teamSeason: { select: { teamId: true } },
        },
      }),
    ]);

  const orgUnitIds = new Set(orgUnitRows.map((row) => row.orgUnitId));
  const teamIds = new Set<string>();

  for (const row of assignmentRows) {
    if (row.teamId) {
      teamIds.add(row.teamId);
    }
  }
  for (const row of squadRows) {
    teamIds.add(row.teamSeason.teamId);
  }
  for (const row of trainerRows) {
    teamIds.add(row.teamSeason.teamId);
  }

  return {
    tenantId,
    personId,
    orgUnitIds,
    teamIds,
    roleAssignments: assignmentRows.map((row) => ({
      functionKey: row.functionKey,
      orgUnitId: row.orgUnitId,
      teamId: row.teamId,
    })),
  };
}
