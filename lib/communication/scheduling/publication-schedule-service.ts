/**
 * SCE-COMM-16 — schedule CRUD + validation (publication remains canonical publish services).
 */

import type { PlatformCommunicationPublicationScheduleStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  parseTenantLocalDateTimeInputOrThrow,
  resolveTenantEventTimezone,
} from "@/lib/events/tenant-local-datetime";
import {
  schedulingIntentFromPublicationSchedule,
  type CampaignOrchestrationMeta,
} from "@/lib/communication/campaign/campaign-orchestration-meta";
import {
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { recordPlatformCommunicationAudit } from "@/lib/communication/team/platform-communication-audit";
import { COMM_PUBLICATION_SCHEDULE_DEFAULT_MAX_ATTEMPTS } from "@/lib/communication/scheduling/publication-schedule-constants";

export type PublicationScheduleListItem = {
  id: string;
  communicationId: string;
  kind: string;
  status: PlatformCommunicationPublicationScheduleStatus;
  scheduledAt: string;
  timezone: string;
  authorUserId: string | null;
  subject: string | null;
  internalName: string | null;
};

async function loadCommunicationForSchedule(input: { tenantId: string; communicationId: string }) {
  const row = await prisma.platformCommunication.findFirst({
    where: { id: input.communicationId, tenantId: input.tenantId },
    select: {
      id: true,
      tenantId: true,
      kind: true,
      status: true,
      subject: true,
      internalName: true,
      orchestrationMetaJson: true,
    },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  if (row.status === "PUBLISHED" || row.status === "ARCHIVED") {
    throw new TeamCommunicationValidationError("communication lifecycle does not allow scheduling");
  }
  return row;
}

export async function resolveTenantTimezoneForScheduling(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true },
  });
  return resolveTenantEventTimezone(tenant?.timezone);
}

export function parseScheduleInstant(input: {
  scheduledAtLocal: string;
  timezone: string;
  now?: Date;
}): Date {
  const instant = parseTenantLocalDateTimeInputOrThrow(input.scheduledAtLocal, input.timezone);
  const now = input.now ?? new Date();
  if (instant.getTime() <= now.getTime()) {
    throw new TeamCommunicationValidationError("scheduled time must be in the future");
  }
  return instant;
}

async function syncOrchestrationSchedulingMeta(input: {
  communicationId: string;
  scheduling: CampaignOrchestrationMeta["scheduling"] | null;
  existingOrchestration: unknown;
}) {
  const record: Record<string, unknown> =
    input.existingOrchestration && typeof input.existingOrchestration === "object"
      ? { ...(input.existingOrchestration as Record<string, unknown>) }
      : { schemaVersion: 1, channels: { inApp: true, push: true, email: true } };

  const nextScheduling = input.scheduling ?? { mode: "IMMEDIATE" as const, scheduledAt: null, timezone: null };
  record.scheduling = nextScheduling;

  await prisma.platformCommunication.update({
    where: { id: input.communicationId },
    data: { orchestrationMetaJson: record as Prisma.InputJsonValue },
  });
}

export async function createPlatformCommunicationPublicationSchedule(input: {
  tenantId: string;
  communicationId: string;
  actorUserId: string;
  scheduledAtLocal: string;
  timezone?: string;
  now?: Date;
}): Promise<{ scheduleId: string; scheduledAt: string; timezone: string }> {
  const communication = await loadCommunicationForSchedule(input);
  const timezone =
    input.timezone?.trim() || (await resolveTenantTimezoneForScheduling(input.tenantId));
  const scheduledAt = parseScheduleInstant({
    scheduledAtLocal: input.scheduledAtLocal,
    timezone,
    now: input.now,
  });

  const existing = await prisma.platformCommunicationPublicationSchedule.findUnique({
    where: { communicationId: input.communicationId },
  });
  if (existing && (existing.status === "SCHEDULED" || existing.status === "PROCESSING")) {
    throw new TeamCommunicationValidationError("communication already has an active schedule");
  }

  const schedule = await prisma.platformCommunicationPublicationSchedule.create({
    data: {
      tenantId: input.tenantId,
      communicationId: input.communicationId,
      scheduledAt,
      timezone,
      status: "SCHEDULED",
      maxAttempts: COMM_PUBLICATION_SCHEDULE_DEFAULT_MAX_ATTEMPTS,
      createdByUserId: input.actorUserId,
    },
  });

  await syncOrchestrationSchedulingMeta({
    communicationId: input.communicationId,
    scheduling: schedulingIntentFromPublicationSchedule({ scheduledAt, timezone }),
    existingOrchestration: communication.orchestrationMetaJson,
  });

  await recordPlatformCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "COMMUNICATION_SCHEDULE_CREATED",
    communicationId: input.communicationId,
    kind: communication.kind,
    metadata: {
      scheduleId: schedule.id,
      scheduledAt: scheduledAt.toISOString(),
      timezone,
    },
  });

  return {
    scheduleId: schedule.id,
    scheduledAt: scheduledAt.toISOString(),
    timezone,
  };
}

export async function reschedulePlatformCommunicationPublication(input: {
  tenantId: string;
  communicationId: string;
  actorUserId: string;
  scheduledAtLocal: string;
  timezone?: string;
  now?: Date;
}): Promise<{ scheduledAt: string; timezone: string }> {
  const schedule = await prisma.platformCommunicationPublicationSchedule.findFirst({
    where: { tenantId: input.tenantId, communicationId: input.communicationId },
  });
  if (!schedule || schedule.status !== "SCHEDULED") {
    throw new TeamCommunicationValidationError("only scheduled (not processing) items can be rescheduled");
  }

  const communication = await loadCommunicationForSchedule(input);
  const timezone =
    input.timezone?.trim() || schedule.timezone || (await resolveTenantTimezoneForScheduling(input.tenantId));
  const scheduledAt = parseScheduleInstant({
    scheduledAtLocal: input.scheduledAtLocal,
    timezone,
    now: input.now,
  });

  await prisma.platformCommunicationPublicationSchedule.update({
    where: { id: schedule.id },
    data: { scheduledAt, timezone, updatedAt: new Date() },
  });

  await syncOrchestrationSchedulingMeta({
    communicationId: input.communicationId,
    scheduling: schedulingIntentFromPublicationSchedule({ scheduledAt, timezone }),
    existingOrchestration: communication.orchestrationMetaJson,
  });

  await recordPlatformCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "COMMUNICATION_SCHEDULE_UPDATED",
    communicationId: input.communicationId,
    kind: communication.kind,
    metadata: { scheduleId: schedule.id, scheduledAt: scheduledAt.toISOString(), timezone },
  });

  return { scheduledAt: scheduledAt.toISOString(), timezone };
}

export async function cancelPlatformCommunicationPublicationSchedule(input: {
  tenantId: string;
  communicationId: string;
  actorUserId: string;
}): Promise<void> {
  const schedule = await prisma.platformCommunicationPublicationSchedule.findFirst({
    where: { tenantId: input.tenantId, communicationId: input.communicationId },
  });
  if (!schedule) throw new TeamCommunicationNotFoundError();
  if (schedule.status !== "SCHEDULED") {
    throw new TeamCommunicationValidationError("only scheduled items can be cancelled");
  }

  const communication = await prisma.platformCommunication.findFirst({
    where: { id: input.communicationId, tenantId: input.tenantId },
    select: { kind: true, orchestrationMetaJson: true },
  });
  if (!communication) throw new TeamCommunicationNotFoundError();

  const now = new Date();
  await prisma.platformCommunicationPublicationSchedule.update({
    where: { id: schedule.id },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
      cancelledByUserId: input.actorUserId,
    },
  });

  await syncOrchestrationSchedulingMeta({
    communicationId: input.communicationId,
    scheduling: { mode: "IMMEDIATE", scheduledAt: null, timezone: null },
    existingOrchestration: communication.orchestrationMetaJson,
  });

  await recordPlatformCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "COMMUNICATION_SCHEDULE_CANCELLED",
    communicationId: input.communicationId,
    kind: communication.kind,
    metadata: { scheduleId: schedule.id },
  });
}

/** Consumes an active schedule before immediate publish so cron cannot duplicate. */
export async function consumeActivePublicationScheduleForImmediatePublish(input: {
  tenantId: string;
  communicationId: string;
  actorUserId: string;
}): Promise<boolean> {
  const schedule = await prisma.platformCommunicationPublicationSchedule.findFirst({
    where: {
      tenantId: input.tenantId,
      communicationId: input.communicationId,
      status: { in: ["SCHEDULED", "PROCESSING"] },
    },
  });
  if (!schedule) return false;

  const updated = await prisma.platformCommunicationPublicationSchedule.updateMany({
    where: {
      id: schedule.id,
      tenantId: input.tenantId,
      status: { in: ["SCHEDULED", "PROCESSING"] },
    },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledByUserId: input.actorUserId,
    },
  });

  if (updated.count === 1) {
    await recordPlatformCommunicationAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: "COMMUNICATION_SCHEDULE_CANCELLED",
      communicationId: input.communicationId,
      metadata: { scheduleId: schedule.id, reason: "immediate_publish" },
    });
  }

  return updated.count === 1;
}

export async function listUpcomingPublicationSchedules(input: {
  tenantId: string;
  limit?: number;
}): Promise<PublicationScheduleListItem[]> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const rows = await prisma.platformCommunicationPublicationSchedule.findMany({
    where: {
      tenantId: input.tenantId,
      status: { in: ["SCHEDULED", "PROCESSING"] },
    },
    orderBy: [{ scheduledAt: "asc" }],
    take: limit,
    include: {
      communication: {
        select: {
          kind: true,
          subject: true,
          internalName: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    communicationId: row.communicationId,
    kind: row.communication.kind,
    status: row.status,
    scheduledAt: row.scheduledAt.toISOString(),
    timezone: row.timezone,
    authorUserId: row.createdByUserId,
    subject: row.communication.subject,
    internalName: row.communication.internalName,
  }));
}

export async function getPublicationScheduleForCommunication(input: {
  tenantId: string;
  communicationId: string;
}) {
  const row = await prisma.platformCommunicationPublicationSchedule.findFirst({
    where: { tenantId: input.tenantId, communicationId: input.communicationId },
  });
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    scheduledAt: row.scheduledAt.toISOString(),
    timezone: row.timezone,
    attemptCount: row.attemptCount,
    lastFailureReason: row.lastFailureReason,
  };
}
