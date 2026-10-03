import type { ParticipationResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertActorCanRespondForPerson } from "@/lib/participation/authorization";
import { buildParticipationPersonalActionId } from "@/lib/personal-actions/identity";
import { toParticipationEventRef } from "@/lib/participation/event-reference";
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

  if (!row) {
    return undefined;
  }

  let canRespond = false;
  try {
    await assertActorCanRespondForPerson(
      input.tenantId,
      input.actorUserId,
      input.personId,
    );
    canRespond = true;
  } catch {
    canRespond = false;
  }

  const personalActionId = buildParticipationPersonalActionId(input.personId, eventRef);

  return {
    personId: input.personId,
    teamSeasonId: input.teamSeasonId,
    eventKind: input.kind,
    trainingSessionId: input.trainingSessionId,
    eventId: input.eventId,
    status: mapParticipationStatus(row.status),
    canRespond,
    personalActionId,
  };
}
