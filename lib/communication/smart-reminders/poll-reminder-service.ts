/**
 * SCE-COMM-10 — Poll non-responder smart reminders (COMM-07 seam).
 */

import { prisma } from "@/lib/db/prisma";
import { eventCommunicationContext } from "@/lib/communication/platform/seams/event-communication-seam";
import { listPollNonRespondedSnapshotIds } from "@/lib/communication/team/team-poll-communication-service";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { defaultPollNonResponseReminderBody } from "@/lib/communication/event/event-communication-presentation";
import {
  dispatchSmartReminderCommunication,
  resolveSubjectPersonIdsFromSnapshotIds,
} from "@/lib/communication/smart-reminders/smart-reminder-dispatch";
import { eventAudienceSpecFromPersonIds } from "@/lib/communication/event/event-participation-recipients";

async function loadPublishedPollRow(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
}) {
  const row = await prisma.platformCommunication.findFirst({
    where: {
      id: input.communicationId,
      tenantId: input.tenantId,
      status: "PUBLISHED",
      kind: { in: ["POLL", "DATE_POLL"] },
    },
    include: {
      conversation: { select: { teamId: true } },
      poll: { select: { lifecycle: true, deadlineAt: true } },
    },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  if (row.conversation.teamId !== input.teamId) {
    throw new TeamCommunicationForbiddenError();
  }
  return row;
}

export async function previewPollNonResponderReminder(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  viewerCanSend: boolean;
}): Promise<{ nonResponderCount: number }> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const row = await loadPublishedPollRow(input);
  const poll = row.poll;
  if (!poll || poll.lifecycle !== "OPEN") {
    return { nonResponderCount: 0 };
  }
  if (poll.deadlineAt && poll.deadlineAt.getTime() < Date.now()) {
    return { nonResponderCount: 0 };
  }
  const snapshotIds = await listPollNonRespondedSnapshotIds({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });
  const personIds = await resolveSubjectPersonIdsFromSnapshotIds({
    tenantId: input.tenantId,
    snapshotIds,
  });
  return { nonResponderCount: personIds.length };
}

export async function sendPollNonResponderSmartReminder(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  senderUserId: string;
  viewerCanSend: boolean;
  bodyText?: string | null;
  executionIdentity?: string | null;
}): Promise<{ communicationId: string; recipientCount: number; duplicate?: boolean }> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const row = await loadPublishedPollRow(input);
  const poll = row.poll;
  if (!poll || poll.lifecycle !== "OPEN") {
    throw new TeamCommunicationValidationError("poll is not open");
  }
  if (poll.deadlineAt && poll.deadlineAt.getTime() < Date.now()) {
    throw new TeamCommunicationValidationError("poll is expired");
  }

  const snapshotIds = await listPollNonRespondedSnapshotIds({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });
  const personIds = await resolveSubjectPersonIdsFromSnapshotIds({
    tenantId: input.tenantId,
    snapshotIds,
  });
  if (personIds.length === 0) {
    throw new TeamCommunicationValidationError("no poll non-responders");
  }

  const contextRef =
    typeof row.contextRef === "object" &&
    row.contextRef &&
    (row.contextRef as { kind?: string }).kind === "EVENT"
      ? (row.contextRef as ReturnType<typeof eventCommunicationContext>)
      : { kind: "TEAM" as const, teamId: input.teamId };

  const result = await dispatchSmartReminderCommunication({
    tenantId: input.tenantId,
    teamId: input.teamId,
    senderUserId: input.senderUserId,
    kind: "MESSAGE",
    bodyText: input.bodyText?.trim() || defaultPollNonResponseReminderBody(),
    contextRef,
    audienceSpec: eventAudienceSpecFromPersonIds(personIds),
    orchestrationMeta: {
      reminderOrigin: "POLL_NO_RESPONSE",
      sourceCommunicationId: input.communicationId,
    },
    executionIdentity: input.executionIdentity,
  });

  if (result.status === "duplicate_execution") {
    return { communicationId: result.communicationId, recipientCount: 0, duplicate: true };
  }
  return {
    communicationId: result.communicationId,
    recipientCount: result.recipientCount,
  };
}
