/**
 * SCE-COMM-10 — minimal scheduled smart reminder contract (UTC executeAt).
 */

import type { PlatformCommunicationReminderOrigin } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ParticipationEventRef } from "@/lib/participation/types";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";
import { participationEventRefToContextEventId } from "@/lib/communication/event/event-participation-anchor";
import { logAction } from "@/lib/audit/log-action";

export type ReminderScheduleSourceReference =
  | {
      kind: "EVENT_NO_RESPONSE";
      teamSeasonId: string;
      event: ParticipationEventRef;
    }
  | { kind: "POLL_NO_RESPONSE"; communicationId: string }
  | { kind: "REQUEST_NO_RESPONSE"; communicationId: string }
  | { kind: "REQUEST_OPEN_CAPACITY"; communicationId: string; slotId?: string | null };

export function buildReminderExecutionIdentity(input: {
  scheduleId: string;
  executeAtIso: string;
}): string {
  return `schedule:${input.scheduleId}:${input.executeAtIso}`;
}

export async function createCommunicationReminderSchedule(input: {
  tenantId: string;
  teamId: string;
  createdByUserId: string;
  reminderOrigin: PlatformCommunicationReminderOrigin;
  sourceReference: ReminderScheduleSourceReference;
  executeAt: Date;
  timezone: string;
}): Promise<{ scheduleId: string; executionIdentity: string }> {
  if (input.executeAt.getTime() <= Date.now()) {
    throw new TeamCommunicationValidationError("executeAt must be in the future");
  }
  const timezone = input.timezone.trim() || "Europe/Zurich";

  const schedule = await prisma.communicationReminderSchedule.create({
    data: {
      tenantId: input.tenantId,
      teamId: input.teamId,
      reminderOrigin: input.reminderOrigin,
      sourceReferenceJson: input.sourceReference as object,
      executeAt: input.executeAt,
      timezone,
      executionIdentity: "pending",
      createdByUserId: input.createdByUserId,
    },
    select: { id: true, executeAt: true },
  });

  const executionIdentity = buildReminderExecutionIdentity({
    scheduleId: schedule.id,
    executeAtIso: schedule.executeAt.toISOString(),
  });

  await prisma.communicationReminderSchedule.update({
    where: { id: schedule.id },
    data: { executionIdentity },
  });

  await logAction({
    tenantId: input.tenantId,
    actorUserId: input.createdByUserId,
    moduleKey: "communication",
    entityType: "CommunicationReminderSchedule",
    entityId: schedule.id,
    action: "REMINDER_SCHEDULE_CREATED",
    afterJson: {
      scheduleId: schedule.id,
      teamId: input.teamId,
      reminderOrigin: input.reminderOrigin,
      executeAt: schedule.executeAt.toISOString(),
    },
  });

  return { scheduleId: schedule.id, executionIdentity };
}

export async function cancelCommunicationReminderSchedule(input: {
  tenantId: string;
  scheduleId: string;
  actorUserId: string;
}): Promise<void> {
  const row = await prisma.communicationReminderSchedule.findFirst({
    where: { id: input.scheduleId, tenantId: input.tenantId, status: "SCHEDULED" },
    select: { id: true },
  });
  if (!row) {
    throw new TeamCommunicationValidationError("schedule not found or not cancellable");
  }

  await prisma.communicationReminderSchedule.update({
    where: { id: row.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  await logAction({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: "communication",
    entityType: "CommunicationReminderSchedule",
    entityId: row.id,
    action: "REMINDER_SCHEDULE_CANCELLED",
    afterJson: { scheduleId: row.id },
  });
}

export function eventScheduleSourceReference(input: {
  teamSeasonId: string;
  event: ParticipationEventRef;
}): ReminderScheduleSourceReference {
  return {
    kind: "EVENT_NO_RESPONSE",
    teamSeasonId: input.teamSeasonId,
    event: input.event,
  };
}

export function scheduleContextEventId(source: ReminderScheduleSourceReference): string | null {
  if (source.kind === "EVENT_NO_RESPONSE") {
    return participationEventRefToContextEventId(source.event);
  }
  return null;
}
