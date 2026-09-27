/**
 * SCE-COMM-16 — execute due scheduled platform communication publications.
 *
 * Audience resolution occurs at execution time via canonical publish services (COMM-03).
 */

import { prisma } from "@/lib/db/prisma";
import { claimDuePlatformCommunicationPublicationSchedules } from "@/lib/communication/scheduling/publication-schedule-claim";
import { publishScheduledPlatformCommunication } from "@/lib/communication/scheduling/publication-schedule-publish-bridge";
import { recordPlatformCommunicationAudit } from "@/lib/communication/team/platform-communication-audit";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

export type PublicationScheduleProcessorSummary = {
  claimed: number;
  published: number;
  failed: number;
  skipped: number;
};

function sanitizeFailureReason(error: unknown): string {
  if (error instanceof TeamCommunicationValidationError) {
    return error.message.slice(0, 240);
  }
  if (error instanceof Error) {
    return error.message.slice(0, 240);
  }
  return "publication failed";
}

export async function processDuePlatformCommunicationPublicationSchedules(input?: {
  now?: Date;
}): Promise<PublicationScheduleProcessorSummary> {
  const now = input?.now ?? new Date();
  const claimed = await claimDuePlatformCommunicationPublicationSchedules(prisma, { now });

  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const schedule of claimed) {
    const communication = await prisma.platformCommunication.findFirst({
      where: { id: schedule.communicationId, tenantId: schedule.tenantId },
      select: { id: true, kind: true, status: true },
    });

    if (!communication) {
      await prisma.platformCommunicationPublicationSchedule.update({
        where: { id: schedule.id },
        data: {
          status: "FAILED",
          lastFailureReason: "communication not found",
          executedAt: now,
        },
      });
      failed += 1;
      continue;
    }

    if (communication.status === "PUBLISHED") {
      await prisma.platformCommunicationPublicationSchedule.update({
        where: { id: schedule.id },
        data: { status: "PUBLISHED", executedAt: now, lastFailureReason: null },
      });
      published += 1;
      continue;
    }

    if (communication.status === "ARCHIVED") {
      await prisma.platformCommunicationPublicationSchedule.update({
        where: { id: schedule.id },
        data: {
          status: "FAILED",
          executedAt: now,
          lastFailureReason: "communication archived",
        },
      });
      failed += 1;
      continue;
    }

    const senderUserId = schedule.createdByUserId;
    if (!senderUserId) {
      await prisma.platformCommunicationPublicationSchedule.update({
        where: { id: schedule.id },
        data: {
          status: "FAILED",
          executedAt: now,
          lastFailureReason: "missing schedule author",
        },
      });
      failed += 1;
      continue;
    }

    try {
      const result = await publishScheduledPlatformCommunication({
        tenantId: schedule.tenantId,
        communicationId: schedule.communicationId,
        kind: communication.kind,
        senderUserId,
      });

      await prisma.platformCommunicationPublicationSchedule.update({
        where: { id: schedule.id },
        data: {
          status: "PUBLISHED",
          executedAt: now,
          lastFailureReason: null,
        },
      });

      await recordPlatformCommunicationAudit({
        tenantId: schedule.tenantId,
        actorUserId: senderUserId,
        action: "COMMUNICATION_SCHEDULE_EXECUTED",
        communicationId: schedule.communicationId,
        kind: communication.kind,
        status: "PUBLISHED",
        metadata: {
          scheduleId: schedule.id,
          recipientCount: result.recipientCount,
          alreadyPublished: result.alreadyPublished,
        },
      });

      published += 1;
    } catch (error) {
      const reason = sanitizeFailureReason(error);
      const terminal = schedule.attemptCount >= schedule.maxAttempts;

      await prisma.platformCommunicationPublicationSchedule.update({
        where: { id: schedule.id },
        data: terminal
          ? {
              status: "FAILED",
              executedAt: now,
              lastFailureReason: reason,
            }
          : {
              status: "SCHEDULED",
              claimedAt: null,
              leaseExpiresAt: null,
              lastFailureReason: reason,
            },
      });

      if (terminal) {
        await recordPlatformCommunicationAudit({
          tenantId: schedule.tenantId,
          actorUserId: senderUserId,
          action: "COMMUNICATION_SCHEDULE_FAILED",
          communicationId: schedule.communicationId,
          kind: communication.kind,
          metadata: { scheduleId: schedule.id, reason },
        });
        failed += 1;
      } else {
        skipped += 1;
      }
    }
  }

  return { claimed: claimed.length, published, failed, skipped };
}
