/**
 * SCE-COMM-10 — execute due scheduled smart reminders (dynamic recipient resolution at execution time).
 */

import { prisma } from "@/lib/db/prisma";
import type { ReminderScheduleSourceReference } from "@/lib/communication/smart-reminders/reminder-schedule-service";
import { sendEventNoResponseSmartReminder } from "@/lib/communication/event/event-communication-service";
import { sendPollNonResponderSmartReminder } from "@/lib/communication/smart-reminders/poll-reminder-service";
import {
  sendRequestNonResponderSmartReminder,
  sendRequestOpenCapacitySmartReminder,
} from "@/lib/communication/smart-reminders/request-reminder-service";
import { resolveTeamCommunicationAuthorization } from "@/lib/communication/team/team-communication-authorization";

export type ProcessCommunicationReminderSchedulesResult = {
  executed: number;
  duplicates: number;
  skipped: number;
};

function parseSourceReference(value: unknown): ReminderScheduleSourceReference | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const kind = row.kind;
  if (kind === "EVENT_NO_RESPONSE" && row.teamSeasonId && row.event) {
    return row as ReminderScheduleSourceReference;
  }
  if (
    (kind === "POLL_NO_RESPONSE" ||
      kind === "REQUEST_NO_RESPONSE" ||
      kind === "REQUEST_OPEN_CAPACITY") &&
    typeof row.communicationId === "string"
  ) {
    return row as ReminderScheduleSourceReference;
  }
  return null;
}

export async function processDueCommunicationReminderSchedules(input?: {
  now?: Date;
  tenantKey?: string;
}): Promise<ProcessCommunicationReminderSchedulesResult> {
  const now = input?.now ?? new Date();
  const due = await prisma.communicationReminderSchedule.findMany({
    where: {
      status: "SCHEDULED",
      executeAt: { lte: now },
    },
    orderBy: [{ executeAt: "asc" }],
    take: 50,
  });

  let executed = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const schedule of due) {
    const source = parseSourceReference(schedule.sourceReferenceJson);
    if (!source || !schedule.createdByUserId) {
      skipped += 1;
      continue;
    }

    const auth = await resolveTeamCommunicationAuthorization({
      tenantId: schedule.tenantId,
      tenantKey: input?.tenantKey ?? schedule.tenantId,
      userId: schedule.createdByUserId,
      teamId: schedule.teamId,
    });
    if (!auth?.canSend) {
      skipped += 1;
      continue;
    }

    try {
      let duplicate = false;
      if (source.kind === "EVENT_NO_RESPONSE") {
        const result = await sendEventNoResponseSmartReminder({
          tenantId: schedule.tenantId,
          teamId: schedule.teamId,
          teamSeasonId: source.teamSeasonId,
          event: source.event,
          senderUserId: schedule.createdByUserId,
          viewerCanSend: true,
          executionIdentity: schedule.executionIdentity,
        });
        duplicate = result.duplicate === true;
      } else if (source.kind === "POLL_NO_RESPONSE") {
        const result = await sendPollNonResponderSmartReminder({
          tenantId: schedule.tenantId,
          teamId: schedule.teamId,
          communicationId: source.communicationId,
          senderUserId: schedule.createdByUserId,
          viewerCanSend: true,
          executionIdentity: schedule.executionIdentity,
        });
        duplicate = result.duplicate === true;
      } else if (source.kind === "REQUEST_NO_RESPONSE") {
        const result = await sendRequestNonResponderSmartReminder({
          tenantId: schedule.tenantId,
          teamId: schedule.teamId,
          communicationId: source.communicationId,
          senderUserId: schedule.createdByUserId,
          viewerCanSend: true,
          executionIdentity: schedule.executionIdentity,
        });
        duplicate = result.duplicate === true;
      } else if (source.kind === "REQUEST_OPEN_CAPACITY") {
        const result = await sendRequestOpenCapacitySmartReminder({
          tenantId: schedule.tenantId,
          teamId: schedule.teamId,
          communicationId: source.communicationId,
          senderUserId: schedule.createdByUserId,
          viewerCanSend: true,
          slotId: source.slotId,
          executionIdentity: schedule.executionIdentity,
        });
        duplicate = result.duplicate === true;
      }

      await prisma.communicationReminderSchedule.update({
        where: { id: schedule.id },
        data: { status: "EXECUTED", executedAt: now },
      });
      if (duplicate) duplicates += 1;
      else executed += 1;
    } catch {
      skipped += 1;
    }
  }

  return { executed, duplicates, skipped };
}
