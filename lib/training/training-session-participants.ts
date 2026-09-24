/**
 * TRAININGCENTER-UX-03R2 — operational participant roster for a single training session.
 *
 * Read-only presentation DTO sourced from canonical TeamSeason membership and
 * ParticipationResponse rows for this session. No new persistence.
 */

import type { ParticipationResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TrainingSessionNotFoundError } from "./errors";

const ACTIVE_PLAYER_STATUSES = ["ACTIVE", "INJURED", "ABSENT"] as const;

export type TrainingSessionParticipantRole = "TRAINER" | "PLAYER";

export type TrainingSessionParticipantDto = {
  personId: string;
  displayName: string;
  avatarUrl: string | null;
  role: TrainingSessionParticipantRole;
  /** Set only when a ParticipationResponse row exists for this person + session. */
  participationStatus?: ParticipationResponseStatus;
  trainerRoleLabel?: string | null;
};

export type TrainingSessionParticipantRosterDto = {
  teamSeasonId: string;
  teamId: string;
  participants: TrainingSessionParticipantDto[];
};

function formatPersonName(input: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}): string {
  return input.displayName?.trim() || `${input.firstName} ${input.lastName}`.trim();
}

/**
 * Loads trainers + active squad players for the training session's team season,
 * plus batched participation responses for this session (players only).
 */
export async function getTrainingSessionParticipantRoster(
  tenantId: string,
  trainingSessionId: string,
): Promise<TrainingSessionParticipantRosterDto> {
  const session = await prisma.trainingSession.findFirst({
    where: { id: trainingSessionId, tenantId },
    select: {
      id: true,
      teamSeasonId: true,
      teamSeason: {
        select: {
          teamId: true,
          team: { select: { tenantId: true } },
        },
      },
    },
  });

  if (!session) {
    throw new TrainingSessionNotFoundError(trainingSessionId);
  }

  if (session.teamSeason.team.tenantId !== tenantId) {
    throw new TrainingSessionNotFoundError(trainingSessionId);
  }

  const teamSeasonId = session.teamSeasonId;
  const teamId = session.teamSeason.teamId;

  const [trainers, players, responses] = await Promise.all([
    prisma.trainerTeamMember.findMany({
      where: {
        teamSeasonId,
        status: "ACTIVE",
        teamSeason: { team: { tenantId } },
        person: { tenantId },
      },
      orderBy: [{ sortOrder: "asc" }, { person: { lastName: "asc" } }],
      select: {
        roleLabel: true,
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            imageUrl: true,
          },
        },
      },
    }),
    prisma.playerSquadMember.findMany({
      where: {
        teamSeasonId,
        status: { in: [...ACTIVE_PLAYER_STATUSES] },
        teamSeason: { team: { tenantId } },
        person: { tenantId },
      },
      orderBy: [{ sortOrder: "asc" }, { shirtNumber: "asc" }, { person: { lastName: "asc" } }],
      select: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            imageUrl: true,
          },
        },
      },
    }),
    prisma.participationResponse.findMany({
      where: {
        tenantId,
        teamSeasonId,
        eventKind: "TRAINING",
        trainingSessionId,
      },
      select: {
        personId: true,
        status: true,
      },
    }),
  ]);

  const responseByPersonId = new Map(responses.map((row) => [row.personId, row.status]));

  const trainerParticipants: TrainingSessionParticipantDto[] = trainers.map((row) => ({
    personId: row.person.id,
    displayName: formatPersonName(row.person),
    avatarUrl: row.person.imageUrl,
    role: "TRAINER",
    trainerRoleLabel: row.roleLabel,
  }));

  const playerParticipants: TrainingSessionParticipantDto[] = players.map((row) => {
    const status = responseByPersonId.get(row.person.id);
    return {
      personId: row.person.id,
      displayName: formatPersonName(row.person),
      avatarUrl: row.person.imageUrl,
      role: "PLAYER",
      ...(status !== undefined ? { participationStatus: status } : {}),
    };
  });

  return {
    teamSeasonId,
    teamId,
    participants: [...trainerParticipants, ...playerParticipants],
  };
}
