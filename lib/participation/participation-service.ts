/**
 * lib/participation/participation-service.ts
 *
 * TEAM-COCKPIT-03A — canonical participation response write path.
 */

import { Prisma, type ParticipationResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAction } from "@/lib/audit/log-action";
import { resolveParticipationEventContext } from "./event-reference";
import {
  ParticipationTenantMismatchError,
  ParticipationValidationError,
} from "./errors";
import { PARTICIPATION_STATUSES } from "./types";
import type { ParticipationResponseInput } from "./types";

function isParticipationStatus(value: string): value is ParticipationResponseStatus {
  return (PARTICIPATION_STATUSES as readonly string[]).includes(value);
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return true;
  }
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

type ParticipationResponseWriteContext = {
  tenantId: string;
  actorUserId: string | null;
  input: ParticipationResponseInput;
  eventContext: Awaited<ReturnType<typeof resolveParticipationEventContext>>;
  note: string | null;
  respondedAt: Date | null;
};

async function applyParticipationResponseUpdate(
  existing: { id: string; status: ParticipationResponseStatus; note: string | null },
  ctx: ParticipationResponseWriteContext,
): Promise<{ id: string; status: ParticipationResponseStatus }> {
  const updated = await prisma.participationResponse.update({
    where: { id: existing.id },
    data: {
      status: ctx.input.status,
      note: ctx.note,
      respondedAt: ctx.respondedAt,
      responseSource: ctx.input.responseSource,
      respondedByUserId: ctx.actorUserId,
      updatedByUserId: ctx.actorUserId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  void logAction({
    tenantId: ctx.tenantId,
    actorUserId: ctx.actorUserId,
    moduleKey: "participation",
    entityType: "ParticipationResponse",
    entityId: updated.id,
    action: "PARTICIPATION_UPDATE",
    beforeJson: {
      status: existing.status,
      note: existing.note,
    },
    afterJson: {
      status: updated.status,
      note: ctx.note,
      responseSource: ctx.input.responseSource,
    },
  });

  return updated;
}

async function assertPersonOnRoster(
  tenantId: string,
  teamSeasonId: string,
  personId: string,
): Promise<void> {
  const [person, squadMember] = await Promise.all([
    prisma.person.findFirst({
      where: { id: personId, tenantId },
      select: { id: true, isPlayer: true },
    }),
    prisma.playerSquadMember.findFirst({
      where: { teamSeasonId, personId },
      select: { id: true },
    }),
  ]);

  if (!person) {
    throw new ParticipationTenantMismatchError("Person gehört nicht zu diesem Mandanten.");
  }

  if (!person.isPlayer || !squadMember) {
    throw new ParticipationValidationError("Person ist kein Spieler im aktuellen Kader.");
  }
}

export async function respondToParticipation(
  tenantId: string,
  actorUserId: string | null,
  input: ParticipationResponseInput,
): Promise<{ id: string; status: ParticipationResponseStatus }> {
  if (!isParticipationStatus(input.status)) {
    throw new ParticipationValidationError("Ungültiger Teilnahme-Status.");
  }

  const eventContext = await resolveParticipationEventContext(
    tenantId,
    input.teamSeasonId,
    input.event,
  );

  if (eventContext.teamSeasonId !== input.teamSeasonId) {
    throw new ParticipationValidationError("Team-Saison stimmt nicht mit dem Event überein.");
  }

  await assertPersonOnRoster(tenantId, input.teamSeasonId, input.personId);

  const note =
    input.note === null || input.note === undefined ? null : String(input.note).trim() || null;

  const respondedAt = input.status === "OPEN" ? null : new Date();

  const lookupWhere: Prisma.ParticipationResponseWhereInput =
    eventContext.eventKind === "TRAINING"
      ? {
          tenantId,
          personId: input.personId,
          trainingSessionId: eventContext.trainingSessionId,
        }
      : {
          tenantId,
          personId: input.personId,
          eventId: eventContext.eventId,
        };

  const existing = await prisma.participationResponse.findFirst({
    where: lookupWhere,
    select: {
      id: true,
      status: true,
      note: true,
    },
  });

  const writeContext: ParticipationResponseWriteContext = {
    tenantId,
    actorUserId,
    input,
    eventContext,
    note,
    respondedAt,
  };

  if (existing) {
    return applyParticipationResponseUpdate(existing, writeContext);
  }

  try {
    const created = await prisma.participationResponse.create({
      data: {
        tenantId,
        personId: input.personId,
        teamSeasonId: input.teamSeasonId,
        eventKind: eventContext.eventKind,
        trainingSessionId: eventContext.trainingSessionId,
        eventId: eventContext.eventId,
        status: input.status,
        note,
        respondedAt,
        responseSource: input.responseSource,
        respondedByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    void logAction({
      tenantId,
      actorUserId,
      moduleKey: "participation",
      entityType: "ParticipationResponse",
      entityId: created.id,
      action: "PARTICIPATION_RESPONSE",
      afterJson: {
        status: created.status,
        note,
        personId: input.personId,
        eventKind: eventContext.eventKind,
        trainingSessionId: eventContext.trainingSessionId,
        eventId: eventContext.eventId,
        responseSource: input.responseSource,
      },
    });

    return created;
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) {
      throw error;
    }

    const raced = await prisma.participationResponse.findFirst({
      where: lookupWhere,
      select: {
        id: true,
        status: true,
        note: true,
      },
    });

    if (!raced) {
      throw error;
    }

    return applyParticipationResponseUpdate(raced, writeContext);
  }
}

export async function updateParticipationResponse(
  tenantId: string,
  actorUserId: string | null,
  input: ParticipationResponseInput,
): Promise<{ id: string; status: ParticipationResponseStatus }> {
  return respondToParticipation(tenantId, actorUserId, input);
}

export async function getParticipationResponseById(tenantId: string, responseId: string) {
  const response = await prisma.participationResponse.findFirst({
    where: { id: responseId, tenantId },
  });

  if (!response) {
    throw new ParticipationValidationError(`Teilnahme-Rückmeldung nicht gefunden: ${responseId}`);
  }

  return response;
}
