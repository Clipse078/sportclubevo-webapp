/**
 * AUFGABEN-05-PARTICIPATION — canonical participation mutation adapter for PersonalActions.
 * Reuses respondToParticipation; does not create Task rows or duplicate write logic.
 */

import type { ParticipationResponseStatus } from "@prisma/client";
import { assertActorCanRespondForPerson } from "@/lib/participation/authorization";
import { toParticipationEventRef } from "@/lib/participation/event-reference";
import {
  ParticipationEventNotFoundError,
  ParticipationTenantMismatchError,
  ParticipationUnauthorizedError,
  ParticipationValidationError,
} from "@/lib/participation/errors";
import { respondToParticipation } from "@/lib/participation/participation-service";
import { buildParticipationPersonalActionId } from "./identity";
import { parseParticipationPersonalActionId } from "./parse-participation-action-id";

export type SubmitParticipationPersonalActionInput = {
  personalActionId: string;
  personId: string;
  teamSeasonId: string;
  eventKind: "TRAINING" | "MATCH" | "TOURNAMENT";
  trainingSessionId?: string;
  eventId?: string;
  status: "YES" | "NO";
};

export type SubmitParticipationPersonalActionResult =
  | { ok: true; responseId: string; status: ParticipationResponseStatus }
  | { ok: false; message: string };

const USER_MESSAGES = {
  unauthorized: "Du darfst für diese Person keine Teilnahme bestätigen.",
  notFound: "Diese Teilnahme-Anfrage ist nicht mehr verfügbar.",
  validation: "Die Rückmeldung konnte nicht gespeichert werden.",
  identity: "Ungültige Teilnahme-Aktion.",
  generic: "Die Rückmeldung konnte nicht gespeichert werden. Bitte erneut versuchen.",
} as const;

function mapParticipationError(error: unknown): SubmitParticipationPersonalActionResult {
  if (error instanceof ParticipationUnauthorizedError) {
    return { ok: false, message: USER_MESSAGES.unauthorized };
  }
  if (error instanceof ParticipationTenantMismatchError) {
    return { ok: false, message: USER_MESSAGES.unauthorized };
  }
  if (error instanceof ParticipationEventNotFoundError) {
    return { ok: false, message: USER_MESSAGES.notFound };
  }
  if (error instanceof ParticipationValidationError) {
    return { ok: false, message: USER_MESSAGES.validation };
  }
  throw error;
}

function assertIdentityMatchesInput(input: SubmitParticipationPersonalActionInput): void {
  const parsed = parseParticipationPersonalActionId(input.personalActionId);
  if (!parsed) {
    throw new ParticipationValidationError(USER_MESSAGES.identity);
  }

  if (parsed.personId !== input.personId) {
    throw new ParticipationValidationError(USER_MESSAGES.identity);
  }

  const event = toParticipationEventRef({
    eventKind: input.eventKind,
    trainingSessionId: input.trainingSessionId,
    eventId: input.eventId,
  });

  const expectedId = buildParticipationPersonalActionId(parsed.personId, event);
  if (expectedId !== input.personalActionId) {
    throw new ParticipationValidationError(USER_MESSAGES.identity);
  }

  if (parsed.event.eventKind !== event.eventKind) {
    throw new ParticipationValidationError(USER_MESSAGES.identity);
  }
}

export async function submitParticipationPersonalAction(
  tenantId: string,
  actorUserId: string,
  input: SubmitParticipationPersonalActionInput,
): Promise<SubmitParticipationPersonalActionResult> {
  try {
    assertIdentityMatchesInput(input);

    const actor = await assertActorCanRespondForPerson(tenantId, actorUserId, input.personId);

    const event = toParticipationEventRef({
      eventKind: input.eventKind,
      trainingSessionId: input.trainingSessionId,
      eventId: input.eventId,
    });

    const response = await respondToParticipation(tenantId, actorUserId, {
      personId: input.personId,
      teamSeasonId: input.teamSeasonId,
      event,
      status: input.status,
      note: null,
      responseSource: actor.source,
    });

    return { ok: true, responseId: response.id, status: response.status };
  } catch (error) {
    return mapParticipationError(error);
  }
}
