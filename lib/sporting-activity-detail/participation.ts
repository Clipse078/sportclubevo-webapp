import type { ParticipationResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertActorCanRespondForPerson } from "@/lib/participation/authorization";
import { buildParticipationPersonalActionId } from "@/lib/personal-actions/identity";
import { toParticipationEventRef } from "@/lib/participation/event-reference";
import { isParticipationResponseRequested } from "@/lib/participation/participation-response-requested";
import { canRespondToMatchAvailability } from "@/lib/match-squad/match-availability-lifecycle";
import type { SportingActivityDetailKind, SportingActivityDetailParticipation } from "./types";

function mapParticipationStatus(
  status: ParticipationResponseStatus,
): SportingActivityDetailParticipation["status"] {
  switch (status) {
    case "YES":
    case "NO":
    case "MAYBE":
    case "OPEN":
      return status;
    default:
      return "OPEN";
  }
}

async function assertPersonOnTeamSeasonRoster(input: {
  tenantId: string;
  teamSeasonId: string;
  personId: string;
}): Promise<boolean> {
  const member = await prisma.playerSquadMember.findFirst({
    where: {
      teamSeasonId: input.teamSeasonId,
      personId: input.personId,
      teamSeason: { team: { tenantId: input.tenantId } },
    },
    select: { id: true },
  });
  return Boolean(member);
}

export async function loadSportingActivityDetailParticipation(input: {
  tenantId: string;
  actorUserId: string;
  personId: string | null;
  teamSeasonId: string;
  kind: SportingActivityDetailKind;
  trainingSessionId?: string;
  eventId?: string;
}): Promise<SportingActivityDetailParticipation | undefined> {
  if (!input.personId) {
    return undefined;
  }

  const eventRef = toParticipationEventRef({
    eventKind: input.kind,
    trainingSessionId: input.trainingSessionId,
    eventId: input.eventId,
  });

  const row = await prisma.participationResponse.findFirst({
    where: {
      tenantId: input.tenantId,
      personId: input.personId,
      teamSeasonId: input.teamSeasonId,
      ...(input.kind === "TRAINING"
        ? { trainingSessionId: input.trainingSessionId }
        : { eventId: input.eventId }),
    },
    select: { id: true, status: true },
  });

  let actorAuthorized = false;
  try {
    await assertActorCanRespondForPerson(
      input.tenantId,
      input.actorUserId,
      input.personId,
    );
    actorAuthorized = true;
  } catch {
    actorAuthorized = false;
  }

  const status = mapParticipationStatus(row?.status ?? "OPEN");

  if (!row && !actorAuthorized) {
    return undefined;
  }

  let canRespond = false;
  if (actorAuthorized) {
    const onRoster = await assertPersonOnTeamSeasonRoster({
      tenantId: input.tenantId,
      teamSeasonId: input.teamSeasonId,
      personId: input.personId,
    });
    if (onRoster) {
      if (input.kind === "MATCH" && input.eventId) {
        const event = await prisma.event.findFirst({
          where: { id: input.eventId, tenantId: input.tenantId, type: "MATCH" },
          select: {
            startAt: true,
            status: true,
            participationResponseDueAt: true,
          },
        });
        if (
          event &&
          canRespondToMatchAvailability({
            status: event.status,
            startAt: event.startAt,
            participationResponseDueAt: event.participationResponseDueAt,
          }) &&
          isParticipationResponseRequested({
            participationResponseDueAt: event.participationResponseDueAt,
          })
        ) {
          canRespond = true;
        }
      } else {
        canRespond = true;
      }
    }
  }

  if (!row && !canRespond) {
    return undefined;
  }

  const personalActionId = buildParticipationPersonalActionId(input.personId, eventRef);

  return {
    personId: input.personId,
    teamSeasonId: input.teamSeasonId,
    eventKind: input.kind,
    trainingSessionId: input.trainingSessionId,
    eventId: input.eventId,
    status,
    canRespond,
    personalActionId,
    allowedResponses: input.kind === "MATCH" ? ["YES", "NO", "MAYBE"] : ["YES", "NO"],
  };
}
