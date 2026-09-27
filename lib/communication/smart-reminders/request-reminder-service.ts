/**
 * SCE-COMM-10 — Request / Helfereinsatz smart reminders (COMM-08 seams).
 */

import { prisma } from "@/lib/db/prisma";
import {
  listRequestNonRespondedSnapshotIds,
  listRequestSlotsWithOpenCapacity,
} from "@/lib/communication/team/team-request-communication-service";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import {
  defaultRequestNonResponseReminderBody,
  defaultRequestOpenCapacityReminderBody,
} from "@/lib/communication/event/event-communication-presentation";
import {
  dispatchSmartReminderCommunication,
  resolveSubjectPersonIdsFromSnapshotIds,
} from "@/lib/communication/smart-reminders/smart-reminder-dispatch";
import { eventAudienceSpecFromPersonIds } from "@/lib/communication/event/event-participation-recipients";

async function loadPublishedRequestRow(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
}) {
  const row = await prisma.platformCommunication.findFirst({
    where: {
      id: input.communicationId,
      tenantId: input.tenantId,
      status: "PUBLISHED",
      kind: "REQUEST",
    },
    include: {
      conversation: { select: { teamId: true } },
      request: { include: { slots: true } },
    },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  if (row.conversation.teamId !== input.teamId) {
    throw new TeamCommunicationForbiddenError();
  }
  return row;
}

function requestIsActionable(request: {
  lifecycle: string;
  deadlineAt: Date | null;
}): boolean {
  if (request.lifecycle !== "OPEN") return false;
  if (request.deadlineAt && request.deadlineAt.getTime() < Date.now()) return false;
  return true;
}

export async function previewRequestNonResponderReminder(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  viewerCanSend: boolean;
}): Promise<{ nonResponderCount: number }> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const row = await loadPublishedRequestRow(input);
  const request = row.request;
  if (!request || !requestIsActionable(request)) {
    return { nonResponderCount: 0 };
  }
  const snapshotIds = await listRequestNonRespondedSnapshotIds({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });
  const personIds = await resolveSubjectPersonIdsFromSnapshotIds({
    tenantId: input.tenantId,
    snapshotIds,
  });
  return { nonResponderCount: personIds.length };
}

export async function previewRequestOpenCapacityReminder(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  viewerCanSend: boolean;
}): Promise<{ openSlotCount: number; slots: Array<{ slotId: string; label: string; remainingCapacity: number }> }> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const row = await loadPublishedRequestRow(input);
  const request = row.request;
  if (!request || !requestIsActionable(request)) {
    return { openSlotCount: 0, slots: [] };
  }

  const openSlotIds = await listRequestSlotsWithOpenCapacity({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });
  if (openSlotIds.length === 0) {
    return { openSlotCount: 0, slots: [] };
  }

  const claimCounts = await prisma.platformCommunicationRequestClaim.groupBy({
    by: ["slotId"],
    where: { tenantId: input.tenantId, slotId: { in: openSlotIds } },
    _count: { _all: true },
  });
  const countBySlot = new Map(claimCounts.map((row) => [row.slotId, row._count._all]));

  const slots = request.slots
    .filter((slot) => openSlotIds.includes(slot.id))
    .map((slot) => ({
      slotId: slot.id,
      label: slot.label,
      remainingCapacity: Math.max(0, slot.requiredCapacity - (countBySlot.get(slot.id) ?? 0)),
    }));

  return { openSlotCount: slots.length, slots };
}

export async function sendRequestNonResponderSmartReminder(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  senderUserId: string;
  viewerCanSend: boolean;
  bodyText?: string | null;
  executionIdentity?: string | null;
}): Promise<{ communicationId: string; recipientCount: number; duplicate?: boolean }> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const row = await loadPublishedRequestRow(input);
  const request = row.request;
  if (!request || !requestIsActionable(request)) {
    throw new TeamCommunicationValidationError("request is not open");
  }

  const snapshotIds = await listRequestNonRespondedSnapshotIds({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });
  const personIds = await resolveSubjectPersonIdsFromSnapshotIds({
    tenantId: input.tenantId,
    snapshotIds,
  });
  if (personIds.length === 0) {
    throw new TeamCommunicationValidationError("no request non-responders");
  }

  const result = await dispatchSmartReminderCommunication({
    tenantId: input.tenantId,
    teamId: input.teamId,
    senderUserId: input.senderUserId,
    kind: "MESSAGE",
    bodyText: input.bodyText?.trim() || defaultRequestNonResponseReminderBody(),
    contextRef: { kind: "TEAM", teamId: input.teamId },
    audienceSpec: eventAudienceSpecFromPersonIds(personIds),
    orchestrationMeta: {
      reminderOrigin: "REQUEST_NO_RESPONSE",
      sourceCommunicationId: input.communicationId,
    },
    executionIdentity: input.executionIdentity,
  });

  if (result.status === "duplicate_execution") {
    return { communicationId: result.communicationId, recipientCount: 0, duplicate: true };
  }
  return { communicationId: result.communicationId, recipientCount: result.recipientCount };
}

export async function sendRequestOpenCapacitySmartReminder(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  senderUserId: string;
  viewerCanSend: boolean;
  slotId?: string | null;
  bodyText?: string | null;
  executionIdentity?: string | null;
}): Promise<{ communicationId: string; recipientCount: number; duplicate?: boolean }> {
  if (!input.viewerCanSend) throw new TeamCommunicationForbiddenError();
  const row = await loadPublishedRequestRow(input);
  const request = row.request;
  if (!request || !requestIsActionable(request)) {
    throw new TeamCommunicationValidationError("request is not open");
  }

  const openSlotIds = await listRequestSlotsWithOpenCapacity({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });
  const targetSlotId = input.slotId?.trim() || openSlotIds[0] || null;
  if (!targetSlotId || !openSlotIds.includes(targetSlotId)) {
    throw new TeamCommunicationValidationError("no open capacity for request slot");
  }

  const slot = request.slots.find((s) => s.id === targetSlotId);
  if (!slot) throw new TeamCommunicationValidationError("invalid slot");

  const claimCount = await prisma.platformCommunicationRequestClaim.count({
    where: { tenantId: input.tenantId, slotId: targetSlotId },
  });
  const remaining = Math.max(0, slot.requiredCapacity - claimCount);
  if (remaining <= 0) {
    throw new TeamCommunicationValidationError("slot is full");
  }

  const snapshotIds = await listRequestNonRespondedSnapshotIds({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });
  let personIds = await resolveSubjectPersonIdsFromSnapshotIds({
    tenantId: input.tenantId,
    snapshotIds,
  });
  if (personIds.length === 0) {
    const allSnapshots = await prisma.platformCommunicationRecipientSnapshot.findMany({
      where: { tenantId: input.tenantId, communicationId: input.communicationId },
      select: { subjectPersonId: true },
    });
    personIds = [...new Set(allSnapshots.map((s) => s.subjectPersonId))].sort();
  }

  const result = await dispatchSmartReminderCommunication({
    tenantId: input.tenantId,
    teamId: input.teamId,
    senderUserId: input.senderUserId,
    kind: "MESSAGE",
    bodyText:
      input.bodyText?.trim() ||
      defaultRequestOpenCapacityReminderBody({
        slotLabel: slot.label,
        remainingCapacity: remaining,
      }),
    contextRef: { kind: "TEAM", teamId: input.teamId },
    audienceSpec: eventAudienceSpecFromPersonIds(personIds),
    orchestrationMeta: {
      reminderOrigin: "REQUEST_OPEN_CAPACITY",
      sourceCommunicationId: input.communicationId,
      requestSlotIds: [targetSlotId],
    },
    executionIdentity: input.executionIdentity,
  });

  if (result.status === "duplicate_execution") {
    return { communicationId: result.communicationId, recipientCount: 0, duplicate: true };
  }
  return { communicationId: result.communicationId, recipientCount: result.recipientCount };
}
