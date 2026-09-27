/**
 * SCE-COMM-11 — Club MESSAGE / ANNOUNCEMENT / ALERT (formal sends + engagement).
 */

import { PlatformCommunicationRecipientEngagement } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { attachSelectionToPlatformCommunication } from "@/lib/communication/attachment-service";
import {
  COMMUNICATION_KIND_SEMANTICS,
  type CommunicationKind,
} from "@/lib/communication/platform/communication-kinds";
import { canTransitionRecipientEngagement } from "@/lib/communication/platform/engagement";
import {
  createClubCommunicationDraft,
  publishClubCommunication,
} from "@/lib/communication/club/club-communication-service";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { recordPlatformCommunicationAudit } from "@/lib/communication/team/platform-communication-audit";
import { resolvePersonIdForUser } from "@/lib/teams/team-document-auth";
import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";
import { createOrganisationCommunicationContext } from "@/lib/communication/club/club-communication-context";

export type ClubFormalCommunicationKind = Extract<CommunicationKind, "MESSAGE" | "ANNOUNCEMENT" | "ALERT">;

export type ClubCommunicationEngagementSummary = {
  communicationId: string;
  recipientCount: number;
  readCount: number;
  acknowledgedCount: number;
  unreadCount: number;
  acknowledgementRequired: boolean;
};

export type ClubCommunicationRecipientEngagementRow = {
  snapshotId: string;
  subjectPersonId: string;
  subjectName: string;
  deliveryUserId: string;
  engagement: PlatformCommunicationRecipientEngagement;
  readAt: string | null;
  acknowledgedAt: string | null;
  viaGuardianSubstitution: boolean;
};

export function resolveClubAcknowledgementRequired(
  kind: ClubFormalCommunicationKind,
  explicit: boolean | undefined | null,
): boolean {
  if (explicit !== undefined && explicit !== null) return explicit;
  return COMMUNICATION_KIND_SEMANTICS[kind].defaultAckRequired;
}

function assertFormalKind(kind: string): ClubFormalCommunicationKind {
  if (kind === "MESSAGE" || kind === "ANNOUNCEMENT" || kind === "ALERT") return kind;
  throw new TeamCommunicationValidationError("invalid formal communication kind");
}

function sanitizeFormalSubject(
  kind: ClubFormalCommunicationKind,
  subject: string | undefined | null,
): string | null {
  const trimmed = subject?.trim() ?? "";
  if (kind === "ALERT" && !trimmed) {
    throw new TeamCommunicationValidationError("title is required for alerts");
  }
  if (trimmed.length > 240) {
    throw new TeamCommunicationValidationError("title exceeds maximum length");
  }
  return trimmed || null;
}

function sanitizeFormalBody(body: string): string {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed) throw new TeamCommunicationValidationError("body is required");
  if (trimmed.length > MAX_TEAM_COMMUNICATION_BODY_LENGTH) {
    throw new TeamCommunicationValidationError("body exceeds maximum length");
  }
  return trimmed;
}

async function loadPublishedClubCommunication(input: {
  tenantId: string;
  communicationId: string;
}) {
  const row = await prisma.platformCommunication.findFirst({
    where: {
      id: input.communicationId,
      tenantId: input.tenantId,
      status: "PUBLISHED",
    },
    include: {
      conversation: { select: { contextKind: true, teamId: true } },
      senderPerson: { select: { id: true, userId: true } },
    },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  if (row.conversation.contextKind !== "ORGANISATION" || row.conversation.teamId !== null) {
    throw new TeamCommunicationNotFoundError();
  }
  return row;
}

export async function sendClubFormalCommunication(input: {
  tenantId: string;
  senderUserId: string;
  kind: string;
  subject?: string | null;
  bodyText: string;
  audienceSpec: CommunicationAudienceSpec;
  acknowledgementRequired?: boolean;
  attachmentIds?: readonly string[];
}): Promise<{ id: string; recipientCount: number }> {
  const kind = assertFormalKind(input.kind);
  const subject = sanitizeFormalSubject(kind, input.subject);
  const bodyText = sanitizeFormalBody(input.bodyText);
  const acknowledgementRequired = resolveClubAcknowledgementRequired(kind, input.acknowledgementRequired);
  const attachmentIds = [...new Set((input.attachmentIds ?? []).filter(Boolean))];

  const draft = await createClubCommunicationDraft({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    kind,
    bodyText,
    subject,
    audienceSpec: input.audienceSpec,
    contextRef: createOrganisationCommunicationContext(input.tenantId),
    acknowledgementRequired,
  });

  if (attachmentIds.length > 0) {
    await attachSelectionToPlatformCommunication({
      tenantId: input.tenantId,
      actorUserId: input.senderUserId,
      communicationId: draft.id,
      attachmentIds,
    });
  }

  return publishClubCommunication({
    tenantId: input.tenantId,
    communicationId: draft.id,
    senderUserId: input.senderUserId,
  });
}

export async function acknowledgeClubCommunication(input: {
  tenantId: string;
  communicationId: string;
  actorUserId: string;
}): Promise<{ acknowledged: boolean; engagement: PlatformCommunicationRecipientEngagement }> {
  const row = await loadPublishedClubCommunication({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });

  if (!row.acknowledgementRequired) {
    throw new TeamCommunicationValidationError("acknowledgement is not required");
  }

  const snapshots = await prisma.platformCommunicationRecipientSnapshot.findMany({
    where: {
      tenantId: input.tenantId,
      communicationId: row.id,
      deliveryUserId: input.actorUserId,
    },
    select: { id: true, engagement: true, acknowledgedAt: true },
  });

  if (snapshots.length === 0) {
    throw new TeamCommunicationForbiddenError();
  }

  const now = new Date();
  let finalEngagement: PlatformCommunicationRecipientEngagement = snapshots[0]!.engagement;

  for (const snap of snapshots) {
    if (snap.engagement === "ACKNOWLEDGED" || snap.engagement === "RESPONDED") {
      finalEngagement = snap.engagement;
      continue;
    }
    if (!canTransitionRecipientEngagement(snap.engagement, "ACKNOWLEDGED")) continue;
    await prisma.platformCommunicationRecipientSnapshot.update({
      where: { id: snap.id },
      data: {
        engagement: "ACKNOWLEDGED",
        acknowledgedAt: snap.acknowledgedAt ?? now,
      },
    });
    finalEngagement = "ACKNOWLEDGED";
  }

  await recordPlatformCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "COMMUNICATION_ACKNOWLEDGED",
    communicationId: row.id,
    kind: row.kind,
    status: row.status,
  });

  return { acknowledged: true, engagement: finalEngagement };
}

export async function markClubCommunicationRead(input: {
  tenantId: string;
  communicationId: string;
  actorUserId: string;
}): Promise<{ updated: number }> {
  await loadPublishedClubCommunication({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });

  const result = await prisma.platformCommunicationRecipientSnapshot.updateMany({
    where: {
      tenantId: input.tenantId,
      communicationId: input.communicationId,
      deliveryUserId: input.actorUserId,
      engagement: { in: ["PENDING", "DELIVERED"] },
    },
    data: { engagement: "READ", readAt: new Date() },
  });

  return { updated: result.count };
}

export async function getClubCommunicationEngagementSummary(input: {
  tenantId: string;
  communicationId: string;
}): Promise<ClubCommunicationEngagementSummary | null> {
  const row = await loadPublishedClubCommunication({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });

  const grouped = await prisma.platformCommunicationRecipientSnapshot.groupBy({
    by: ["engagement"],
    where: { tenantId: input.tenantId, communicationId: row.id },
    _count: { _all: true },
  });

  let recipientCount = 0;
  let readCount = 0;
  let acknowledgedCount = 0;

  for (const entry of grouped) {
    const count = entry._count._all;
    recipientCount += count;
    if (entry.engagement === "ACKNOWLEDGED" || entry.engagement === "RESPONDED") {
      acknowledgedCount += count;
      readCount += count;
    } else if (entry.engagement === "READ") {
      readCount += count;
    }
  }

  return {
    communicationId: row.id,
    recipientCount,
    readCount,
    acknowledgedCount,
    unreadCount: Math.max(recipientCount - readCount, 0),
    acknowledgementRequired: row.acknowledgementRequired,
  };
}

export async function listClubCommunicationRecipientEngagement(input: {
  tenantId: string;
  communicationId: string;
}): Promise<ClubCommunicationRecipientEngagementRow[]> {
  await loadPublishedClubCommunication({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });

  const rows = await prisma.platformCommunicationRecipientSnapshot.findMany({
    where: { tenantId: input.tenantId, communicationId: input.communicationId },
    orderBy: [{ engagement: "asc" }, { subjectPersonId: "asc" }],
    select: {
      id: true,
      subjectPersonId: true,
      deliveryUserId: true,
      engagement: true,
      readAt: true,
      acknowledgedAt: true,
      viaGuardianSubstitution: true,
      subjectPerson: { select: { firstName: true, lastName: true } },
    },
  });

  return rows.map((row) => ({
    snapshotId: row.id,
    subjectPersonId: row.subjectPersonId,
    subjectName: `${row.subjectPerson.firstName} ${row.subjectPerson.lastName}`.trim(),
    deliveryUserId: row.deliveryUserId,
    engagement: row.engagement,
    readAt: row.readAt?.toISOString() ?? null,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    viaGuardianSubstitution: row.viaGuardianSubstitution,
  }));
}

export async function canInspectClubCommunicationEngagementDetail(input: {
  tenantId: string;
  communicationId: string;
  viewerUserId: string;
  viewerCanViewEngagementDetail: boolean;
}): Promise<boolean> {
  if (input.viewerCanViewEngagementDetail) return true;
  const row = await loadPublishedClubCommunication({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });
  const senderPersonId = row.senderPersonId;
  if (!senderPersonId) return false;
  const viewerPersonId = await resolvePersonIdForUser(input.viewerUserId, input.tenantId).catch(
    () => null,
  );
  return viewerPersonId !== null && viewerPersonId === senderPersonId;
}
