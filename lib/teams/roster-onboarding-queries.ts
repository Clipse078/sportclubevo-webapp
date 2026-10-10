/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01B — read helpers for Team Cockpit roster onboarding UX.
 */

import { prisma } from "@/lib/db/prisma";
import { PERSON_FUNCTION_GROUPS } from "@/lib/people/functions";
import { getCanonicalSeasonLabel } from "@/lib/teams/jahrgang-rules";
import { currentTeamSeasonWhere } from "@/lib/teams/current-season";

const TRAINER_FUNCTION_KEYS = [...PERSON_FUNCTION_GROUPS.TRAINER_STAFF];

export type TrainerAssignmentOnlySuggestion = {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    isTrainer: boolean;
  };
  functionKey: string;
};

export type RosterPersonOnboardingContext = {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    dateOfBirth: string | null;
    isActive: boolean;
    isPlayer: boolean;
    isTrainer: boolean;
  };
  squadMembership: { id: string; status: string } | null;
  trainerMembership: { id: string; status: string } | null;
  otherActivePlayerSquads: Array<{ teamId: string; teamName: string; seasonLabel: string }>;
  otherActiveTrainerTeams: Array<{ teamId: string; teamName: string; seasonLabel: string }>;
};

function formatSeasonLabel(startDate: Date, fallbackName: string): string {
  return getCanonicalSeasonLabel(startDate) ?? fallbackName;
}

/**
 * Active trainer PersonAssignments for this Team without an ACTIVE TrainerTeamMember
 * on the given TeamSeason (State B / ASSIGNMENT_ONLY for this season roster).
 */
export async function listTrainerAssignmentOnlySuggestions(input: {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
}): Promise<TrainerAssignmentOnlySuggestion[]> {
  const [assignments, activeRosterPersonIds] = await Promise.all([
    prisma.personAssignment.findMany({
      where: {
        tenantId: input.tenantId,
        teamId: input.teamId,
        status: "ACTIVE",
        functionKey: { in: TRAINER_FUNCTION_KEYS },
        person: { tenantId: input.tenantId, isActive: true },
      },
      orderBy: [{ person: { lastName: "asc" } }, { person: { firstName: "asc" } }],
      select: {
        functionKey: true,
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
            phone: true,
            isTrainer: true,
          },
        },
      },
    }),
    prisma.trainerTeamMember.findMany({
      where: {
        teamSeasonId: input.teamSeasonId,
        status: "ACTIVE",
        teamSeason: {
          teamId: input.teamId,
          team: { tenantId: input.tenantId },
        },
      },
      select: { personId: true },
    }),
  ]);

  const onRoster = new Set(activeRosterPersonIds.map((row) => row.personId));

  const seen = new Set<string>();
  const suggestions: TrainerAssignmentOnlySuggestion[] = [];

  for (const row of assignments) {
    if (onRoster.has(row.person.id) || seen.has(row.person.id)) {
      continue;
    }
    seen.add(row.person.id);
    suggestions.push({
      person: row.person,
      functionKey: row.functionKey,
    });
  }

  return suggestions;
}

export async function loadRosterPersonOnboardingContext(input: {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
  personId: string;
}): Promise<RosterPersonOnboardingContext | null> {
  const teamSeason = await prisma.teamSeason.findFirst({
    where: {
      id: input.teamSeasonId,
      teamId: input.teamId,
      team: { tenantId: input.tenantId },
    },
    select: {
      id: true,
      season: { select: { isActive: true } },
    },
  });

  if (!teamSeason) {
    return null;
  }

  const person = await prisma.person.findFirst({
    where: { id: input.personId, tenantId: input.tenantId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      dateOfBirth: true,
      isActive: true,
      isPlayer: true,
      isTrainer: true,
      playerSquadMembers: {
        where: {
          teamSeasonId: input.teamSeasonId,
        },
        select: { id: true, status: true },
        take: 1,
      },
      trainerTeamMembers: {
        where: {
          teamSeasonId: input.teamSeasonId,
        },
        select: { id: true, status: true },
        take: 1,
      },
    },
  });

  if (!person) {
    return null;
  }

  const currentSeasonScope = currentTeamSeasonWhere();

  const [otherPlayerRows, otherTrainerRows] = await Promise.all([
    prisma.playerSquadMember.findMany({
      where: {
        personId: input.personId,
        status: "ACTIVE",
        teamSeasonId: { not: input.teamSeasonId },
        teamSeason: {
          status: "ACTIVE",
          ...currentSeasonScope,
          team: { tenantId: input.tenantId },
        },
      },
      select: {
        teamSeason: {
          select: {
            teamId: true,
            displayName: true,
            team: { select: { name: true } },
            season: { select: { name: true, startDate: true } },
          },
        },
      },
    }),
    prisma.trainerTeamMember.findMany({
      where: {
        personId: input.personId,
        status: "ACTIVE",
        teamSeasonId: { not: input.teamSeasonId },
        teamSeason: {
          status: "ACTIVE",
          ...currentSeasonScope,
          team: { tenantId: input.tenantId },
        },
      },
      select: {
        teamSeason: {
          select: {
            teamId: true,
            displayName: true,
            team: { select: { name: true } },
            season: { select: { name: true, startDate: true } },
          },
        },
      },
    }),
  ]);

  return {
    person: {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      displayName: person.displayName,
      dateOfBirth: person.dateOfBirth?.toISOString() ?? null,
      isActive: person.isActive,
      isPlayer: person.isPlayer,
      isTrainer: person.isTrainer,
    },
    squadMembership: person.playerSquadMembers[0] ?? null,
    trainerMembership: person.trainerTeamMembers[0] ?? null,
    otherActivePlayerSquads: otherPlayerRows.map((row) => ({
      teamId: row.teamSeason.teamId,
      teamName: row.teamSeason.displayName || row.teamSeason.team.name,
      seasonLabel: formatSeasonLabel(
        row.teamSeason.season.startDate,
        row.teamSeason.season.name,
      ),
    })),
    otherActiveTrainerTeams: otherTrainerRows.map((row) => ({
      teamId: row.teamSeason.teamId,
      teamName: row.teamSeason.displayName || row.teamSeason.team.name,
      seasonLabel: formatSeasonLabel(
        row.teamSeason.season.startDate,
        row.teamSeason.season.name,
      ),
    })),
  };
}
