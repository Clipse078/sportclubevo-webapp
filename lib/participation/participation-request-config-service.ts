/**
 * AUFGABEN-05-NOTIFY-DEADLINE — mutate participation request deadline/reminder configuration.
 */

import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAction } from "@/lib/audit/log-action";
import { ParticipationEventNotFoundError, ParticipationValidationError } from "./errors";
import {
  assertParticipationDueBeforeEventStart,
  assertParticipationDueBeforeTrainingStart,
  PARTICIPATION_EVENT_START_ERROR,
  PARTICIPATION_TRAINING_START_ERROR,
} from "./participation-start-invariant";
import {
  recomputeParticipationRemindersAfterDueChange,
  resolveParticipationResponseDeadlineSchedule,
  type ParticipationResponseDeadlineSchedule,
} from "./participation-response-deadline-schedule";

const PARTICIPATION_EVENT_TYPES = new Set<EventType>(["MATCH", "TOURNAMENT", "OTHER"]);

export type ParticipationRequestConfigMutation = {
  participationResponseDueAt?: Date | null;
  participationReminder1At?: Date | null;
  participationReminder2At?: Date | null;
  participationReminder1PresetKey?: string | null;
  participationReminder2PresetKey?: string | null;
};

function scheduleToSessionData(schedule: ParticipationResponseDeadlineSchedule) {
  return {
    participationResponseDueAt: schedule.dueAt,
    participationReminder1At: schedule.reminder1At,
    participationReminder2At: schedule.reminder2At,
    participationReminder1PresetKey: schedule.reminder1PresetKey,
    participationReminder2PresetKey: schedule.reminder2PresetKey,
  };
}

export async function updateTrainingSessionParticipationRequestConfig(
  tenantId: string,
  trainingSessionId: string,
  mutation: ParticipationRequestConfigMutation,
  actorUserId: string | null,
): Promise<void> {
  const session = await prisma.trainingSession.findFirst({
    where: { id: trainingSessionId, tenantId },
    select: {
      id: true,
      startAt: true,
      overrideStartAt: true,
      timezone: true,
      status: true,
      participationResponseDueAt: true,
      participationReminder1At: true,
      participationReminder2At: true,
      participationReminder1PresetKey: true,
      participationReminder2PresetKey: true,
    },
  });

  if (!session) {
    throw new ParticipationEventNotFoundError("Trainingseinheit nicht gefunden.");
  }

  if (session.status !== "SCHEDULED") {
    throw new ParticipationValidationError(
      "Antwortfrist kann nur für geplante Trainingseinheiten konfiguriert werden.",
    );
  }

  const eventStartAt = session.overrideStartAt ?? session.startAt;
  const timeZone = session.timezone;

  const nextDue =
    mutation.participationResponseDueAt !== undefined
      ? mutation.participationResponseDueAt
      : session.participationResponseDueAt;

  const schedule =
    mutation.participationResponseDueAt !== undefined ||
    mutation.participationReminder1At !== undefined ||
    mutation.participationReminder2At !== undefined ||
    mutation.participationReminder1PresetKey !== undefined ||
    mutation.participationReminder2PresetKey !== undefined
      ? recomputeParticipationRemindersAfterDueChange({
          participationResponseDueAt: nextDue,
          participationReminder1At:
            mutation.participationReminder1At !== undefined
              ? mutation.participationReminder1At
              : session.participationReminder1At,
          participationReminder2At:
            mutation.participationReminder2At !== undefined
              ? mutation.participationReminder2At
              : session.participationReminder2At,
          participationReminder1PresetKey:
            mutation.participationReminder1PresetKey !== undefined
              ? mutation.participationReminder1PresetKey
              : session.participationReminder1PresetKey,
          participationReminder2PresetKey:
            mutation.participationReminder2PresetKey !== undefined
              ? mutation.participationReminder2PresetKey
              : session.participationReminder2PresetKey,
          timeZone,
          eventStartAt,
        })
      : resolveParticipationResponseDeadlineSchedule({
          participationResponseDueAt: session.participationResponseDueAt,
          participationReminder1At: session.participationReminder1At,
          participationReminder2At: session.participationReminder2At,
          participationReminder1PresetKey: session.participationReminder1PresetKey,
          participationReminder2PresetKey: session.participationReminder2PresetKey,
          timeZone,
          eventStartAt,
        });

  const data = scheduleToSessionData(schedule);

  await prisma.trainingSession.update({
    where: { id: session.id },
    data,
  });

  void logAction({
    tenantId,
    actorUserId,
    moduleKey: "participation",
    entityType: "TrainingSession",
    entityId: session.id,
    action: "PARTICIPATION_REQUEST_CONFIG_UPDATE",
    beforeJson: {
      participationResponseDueAt: session.participationResponseDueAt?.toISOString() ?? null,
      participationReminder1At: session.participationReminder1At?.toISOString() ?? null,
      participationReminder2At: session.participationReminder2At?.toISOString() ?? null,
    },
    afterJson: {
      participationResponseDueAt: data.participationResponseDueAt?.toISOString() ?? null,
      participationReminder1At: data.participationReminder1At?.toISOString() ?? null,
      participationReminder2At: data.participationReminder2At?.toISOString() ?? null,
    },
  });
}

export async function updateEventParticipationRequestConfig(
  tenantId: string,
  eventId: string,
  mutation: ParticipationRequestConfigMutation,
  actorUserId: string | null,
): Promise<void> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: {
      id: true,
      type: true,
      startAt: true,
      status: true,
      participationResponseDueAt: true,
      participationReminder1At: true,
      participationReminder2At: true,
      participationReminder1PresetKey: true,
      participationReminder2PresetKey: true,
      tenant: { select: { timezone: true } },
    },
  });

  if (!event) {
    throw new ParticipationEventNotFoundError("Event nicht gefunden.");
  }

  if (!PARTICIPATION_EVENT_TYPES.has(event.type)) {
    throw new ParticipationValidationError(
      "Antwortfrist ist für diesen Event-Typ nicht verfügbar.",
    );
  }

  if (event.status === "CANCELLED") {
    throw new ParticipationValidationError(
      "Antwortfrist kann nicht für abgesagte Events konfiguriert werden.",
    );
  }

  const timeZone = event.tenant?.timezone ?? "Europe/Zurich";
  const nextDue =
    mutation.participationResponseDueAt !== undefined
      ? mutation.participationResponseDueAt
      : event.participationResponseDueAt;

  const schedule = recomputeParticipationRemindersAfterDueChange({
    participationResponseDueAt: nextDue,
    participationReminder1At:
      mutation.participationReminder1At !== undefined
        ? mutation.participationReminder1At
        : event.participationReminder1At,
    participationReminder2At:
      mutation.participationReminder2At !== undefined
        ? mutation.participationReminder2At
        : event.participationReminder2At,
    participationReminder1PresetKey:
      mutation.participationReminder1PresetKey !== undefined
        ? mutation.participationReminder1PresetKey
        : event.participationReminder1PresetKey,
    participationReminder2PresetKey:
      mutation.participationReminder2PresetKey !== undefined
        ? mutation.participationReminder2PresetKey
        : event.participationReminder2PresetKey,
    timeZone,
    eventStartAt: event.startAt,
  });

  const data = scheduleToSessionData(schedule);

  await prisma.event.update({
    where: { id: event.id },
    data,
  });

  void logAction({
    tenantId,
    actorUserId,
    moduleKey: "participation",
    entityType: "Event",
    entityId: event.id,
    action: "PARTICIPATION_REQUEST_CONFIG_UPDATE",
    beforeJson: {
      participationResponseDueAt: event.participationResponseDueAt?.toISOString() ?? null,
    },
    afterJson: {
      participationResponseDueAt: data.participationResponseDueAt?.toISOString() ?? null,
    },
  });
}

export async function assertEventStartCompatibleWithParticipationDue(
  tenantId: string,
  eventId: string,
  newStartAt: Date,
): Promise<void> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { participationResponseDueAt: true, type: true },
  });
  if (!event?.participationResponseDueAt) return;
  if (!PARTICIPATION_EVENT_TYPES.has(event.type)) return;
  assertParticipationDueBeforeEventStart(event.participationResponseDueAt, newStartAt);
}

export async function updateTrainingSeriesParticipationRequestPolicy(
  tenantId: string,
  trainingSeriesId: string,
  input: {
    participationResponseDueDaysBefore?: number | null;
    participationResponseDueLocalTime?: string | null;
    participationReminder1PresetKey?: string | null;
    participationReminder2PresetKey?: string | null;
  },
  actorUserId: string | null,
): Promise<void> {
  const series = await prisma.trainingSeries.findFirst({
    where: { id: trainingSeriesId, tenantId },
    select: { id: true },
  });
  if (!series) {
    throw new ParticipationEventNotFoundError("Trainingsserie nicht gefunden.");
  }

  if (
    input.participationResponseDueDaysBefore != null &&
    input.participationResponseDueDaysBefore < 0
  ) {
    throw new ParticipationValidationError("Antwortfrist-Offset der Serie ist ungültig.");
  }

  await prisma.trainingSeries.update({
    where: { id: series.id },
    data: {
      participationResponseDueDaysBefore:
        input.participationResponseDueDaysBefore !== undefined
          ? input.participationResponseDueDaysBefore
          : undefined,
      participationResponseDueLocalTime:
        input.participationResponseDueLocalTime !== undefined
          ? input.participationResponseDueLocalTime
          : undefined,
      participationReminder1PresetKey:
        input.participationReminder1PresetKey !== undefined
          ? input.participationReminder1PresetKey
          : undefined,
      participationReminder2PresetKey:
        input.participationReminder2PresetKey !== undefined
          ? input.participationReminder2PresetKey
          : undefined,
    },
  });

  void logAction({
    tenantId,
    actorUserId,
    moduleKey: "participation",
    entityType: "TrainingSeries",
    entityId: series.id,
    action: "PARTICIPATION_SERIES_POLICY_UPDATE",
    beforeJson: {},
    afterJson: input,
  });
}

export async function assertTrainingSessionStartCompatibleWithParticipationDue(
  tenantId: string,
  trainingSessionId: string,
  newStartAt: Date,
): Promise<void> {
  const session = await prisma.trainingSession.findFirst({
    where: { id: trainingSessionId, tenantId },
    select: { participationResponseDueAt: true },
  });
  if (!session?.participationResponseDueAt) return;
  assertParticipationDueBeforeTrainingStart(session.participationResponseDueAt, newStartAt);
}

export { PARTICIPATION_EVENT_START_ERROR, PARTICIPATION_TRAINING_START_ERROR };
