/**
 * SCE-COMM-04 — Team communication application service (presentation-independent).
 */

import type { PlatformCommunicationKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isCommunicationKind } from "@/lib/communication/platform/communication-kinds";
import { validateCommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { validateCommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-validation";
import { computeAudienceFingerprint } from "@/lib/communication/platform/recipient-resolution/audience-fingerprint";
import { resolveCommunicationRecipientsForDispatch } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import { buildDispatchRecipientSnapshots } from "@/lib/communication/platform/recipient-resolution/snapshot-builder";
import { createTeamCommunicationContext } from "@/lib/communication/team/team-communication-context";
import {
  getOrCreateTeamCommunicationConversation,
} from "@/lib/communication/team/team-communication-context";
import {
  structuralExclusionForTeamAudiencePreset,
  teamAudienceSpecForPreset,
  type TeamAudiencePreset,
} from "@/lib/communication/team/team-audience-presets";
import {
  canTransitionCommunicationStatus,
  communicationAudienceMutable,
} from "@/lib/communication/team/team-communication-lifecycle";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationTenantMismatchError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { recordPlatformCommunicationAudit } from "@/lib/communication/team/platform-communication-audit";
import { emitTeamCommunicationPublishedNotifications } from "@/lib/communication/team/team-communication-notification-producer";
import { resolvePersonIdForUser } from "@/lib/teams/team-document-auth";

import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";

export { MAX_TEAM_COMMUNICATION_BODY_LENGTH };

export type TeamCommunicationListItem = {
  id: string;
  kind: PlatformCommunicationKind;
  status: string;
  bodyText: string;
  subject: string | null;
  acknowledgementRequired: boolean;
  publishedAt: string | null;
  createdAt: string;
  senderPerson: { id: string; firstName: string; lastName: string } | null;
};

export type TeamCommunicationSpace = {
  teamId: string;
  conversationId: string;
  contextRef: ReturnType<typeof createTeamCommunicationContext>;
  defaultAudiencePreset: TeamAudiencePreset;
};

const COMMUNICATION_LIST_INCLUDE = {
  senderPerson: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.PlatformCommunicationInclude;

function sanitizeBodyText(body: string, options?: { allowEmpty?: boolean }): string {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed && !options?.allowEmpty) {
    throw new TeamCommunicationValidationError("body is required");
  }
  if (trimmed.length > MAX_TEAM_COMMUNICATION_BODY_LENGTH) {
    throw new TeamCommunicationValidationError("body exceeds maximum length");
  }
  return trimmed;
}

function assertKindSupportedForFoundation(kind: string): PlatformCommunicationKind {
  if (!isCommunicationKind(kind)) {
    throw new TeamCommunicationValidationError("invalid communication kind");
  }
  if (kind === "MESSAGE" || kind === "ANNOUNCEMENT" || kind === "ALERT") {
    return kind;
  }
  throw new TeamCommunicationValidationError(`kind ${kind} is not enabled in COMM-04`);
}

export async function getTeamCommunicationSpace(input: {
  tenantId: string;
  teamId: string;
}): Promise<TeamCommunicationSpace | null> {
  const conversation = await getOrCreateTeamCommunicationConversation(input);
  if (!conversation) return null;

  return {
    teamId: input.teamId,
    conversationId: conversation.id,
    contextRef: createTeamCommunicationContext(input.teamId),
    defaultAudiencePreset: "ALL",
  };
}

export async function listTeamCommunications(input: {
  tenantId: string;
  teamId: string;
  limit?: number;
}): Promise<TeamCommunicationListItem[]> {
  const conversation = await prisma.platformCommunicationConversation.findFirst({
    where: {
      tenantId: input.tenantId,
      teamId: input.teamId,
      contextKind: "TEAM",
      conversationKind: "TEAM_GENERAL",
    },
    select: { id: true },
  });
  if (!conversation) return [];

  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const rows = await prisma.platformCommunication.findMany({
    where: {
      tenantId: input.tenantId,
      conversationId: conversation.id,
      status: { in: ["PUBLISHED", "DRAFT", "ARCHIVED"] },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: COMMUNICATION_LIST_INCLUDE,
  });

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    status: row.status,
    bodyText: row.bodyText,
    subject: row.subject,
    acknowledgementRequired: row.acknowledgementRequired,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    senderPerson: row.senderPerson,
  }));
}

export async function createTeamCommunicationDraft(input: {
  tenantId: string;
  teamId: string;
  senderUserId: string;
  kind?: string;
  bodyText: string;
  subject?: string | null;
  audiencePreset?: TeamAudiencePreset;
  replyToCommunicationId?: string | null;
  allowEmptyBody?: boolean;
  acknowledgementRequired?: boolean;
}): Promise<{ id: string }> {
  const kind = assertKindSupportedForFoundation(input.kind ?? "MESSAGE");
  const bodyText = sanitizeBodyText(input.bodyText, {
    allowEmpty: input.allowEmptyBody === true,
  });
  const contextRef = createTeamCommunicationContext(input.teamId);
  const ctxErr = validateCommunicationContextRef(input.tenantId, contextRef);
  if (ctxErr) throw new TeamCommunicationValidationError(ctxErr);

  const audience = teamAudienceSpecForPreset(input.teamId, input.audiencePreset ?? "ALL");
  const audienceErr = validateCommunicationAudienceSpec(audience);
  if (audienceErr) throw new TeamCommunicationValidationError(audienceErr);

  const conversation = await getOrCreateTeamCommunicationConversation({
    tenantId: input.tenantId,
    teamId: input.teamId,
  });
  if (!conversation) throw new TeamCommunicationNotFoundError("team not found");

  const senderPersonId = await resolvePersonIdForUser(input.senderUserId, input.tenantId);

  const created = await prisma.platformCommunication.create({
    data: {
      tenantId: input.tenantId,
      conversationId: conversation.id,
      kind,
      status: "DRAFT",
      contextRef: contextRef as unknown as Prisma.InputJsonValue,
      senderPersonId,
      subject: input.subject?.trim() || null,
      bodyText,
      replyToCommunicationId: input.replyToCommunicationId?.trim() || null,
      audienceSpecJson: audience as unknown as Prisma.InputJsonValue,
      acknowledgementRequired: input.acknowledgementRequired === true,
      createdByUserId: input.senderUserId,
    },
    select: { id: true, kind: true, status: true },
  });

  await recordPlatformCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.senderUserId,
    action: "COMMUNICATION_CREATED",
    communicationId: created.id,
    teamId: input.teamId,
    kind: created.kind,
    status: created.status,
  });

  return { id: created.id };
}

export async function publishTeamCommunication(input: {
  tenantId: string;
  teamId: string;
  communicationId: string;
  senderUserId: string;
  audiencePreset?: TeamAudiencePreset;
}): Promise<{ id: string; recipientCount: number }> {
  const row = await prisma.platformCommunication.findFirst({
    where: { id: input.communicationId, tenantId: input.tenantId },
    include: {
      conversation: { select: { teamId: true } },
    },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  if (row.conversation.teamId !== input.teamId) {
    throw new TeamCommunicationTenantMismatchError();
  }
  if (!canTransitionCommunicationStatus(row.status, "PUBLISHED")) {
    throw new TeamCommunicationValidationError("invalid status transition");
  }

  const preset = input.audiencePreset ?? "ALL";
  if (communicationAudienceMutable(row.status)) {
    const audience = teamAudienceSpecForPreset(input.teamId, preset);
    const audienceErr = validateCommunicationAudienceSpec(audience);
    if (audienceErr) throw new TeamCommunicationValidationError(audienceErr);
    row.audienceSpecJson = audience as unknown as Prisma.JsonValue;
  }

  const audience = row.audienceSpecJson as import("@/lib/communication/platform/audience/zielgruppe-definition").CommunicationAudienceSpec;
  const contextRef = row.contextRef as import("@/lib/communication/platform/communication-context").CommunicationContextRef;
  const exclusion = structuralExclusionForTeamAudiencePreset(input.teamId, preset);

  const dispatch = await resolveCommunicationRecipientsForDispatch(
    {
      tenantId: input.tenantId,
      senderActor: { userId: input.senderUserId },
      audience,
      context: contextRef,
      channel: "IN_APP",
      category: "TEAM_OPERATIONAL",
      mode: "DISPATCH",
    },
    input.communicationId,
    { structuralExclusionSelectors: exclusion },
  );

  const fingerprint = dispatch.core.metadata.audienceFingerprint;
  const snapshotRows = buildDispatchRecipientSnapshots({
    communicationDispatchRef: input.communicationId,
    tenantId: input.tenantId,
    audienceFingerprint: fingerprint,
    channel: "IN_APP",
    resolvedAt: dispatch.core.metadata.resolvedAt,
    deliveryTargets: dispatch.pipeline.deliveryTargets,
  });

  if (snapshotRows.length === 0) {
    throw new TeamCommunicationValidationError("no eligible recipients for dispatch");
  }

  const publishedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.platformCommunication.update({
      where: { id: row.id },
      data: {
        status: "PUBLISHED",
        publishedAt,
        audienceSpecJson: audience as unknown as Prisma.InputJsonValue,
        audienceFingerprint: fingerprint,
      },
    });

    await tx.platformCommunicationRecipientSnapshot.createMany({
      data: snapshotRows.map((snap) => ({
        tenantId: input.tenantId,
        communicationId: row.id,
        subjectPersonId: snap.subjectPersonId,
        deliveryUserId: snap.deliveryUserId,
        channel: snap.channel,
        audienceFingerprint: snap.audienceFingerprint,
        viaGuardianSubstitution: snap.viaGuardianSubstitution,
        resolvedAt: new Date(snap.resolvedAt),
      })),
      skipDuplicates: true,
    });

    await emitTeamCommunicationPublishedNotifications(tx, {
      tenantId: input.tenantId,
      communicationId: row.id,
      teamId: input.teamId,
      kind: row.kind,
      title: row.subject?.trim() || "Team-Nachricht",
      bodyPreview: row.bodyText.slice(0, 240),
      deliveryUserIds: snapshotRows.map((s) => s.deliveryUserId),
      excludeUserIds: [input.senderUserId],
    });
  });

  await recordPlatformCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.senderUserId,
    action: "COMMUNICATION_PUBLISHED",
    communicationId: row.id,
    teamId: input.teamId,
    kind: row.kind,
    status: "PUBLISHED",
  });

  return { id: row.id, recipientCount: snapshotRows.length };
}

export async function archiveTeamCommunication(input: {
  tenantId: string;
  communicationId: string;
  actorUserId: string;
}): Promise<void> {
  const row = await prisma.platformCommunication.findFirst({
    where: { id: input.communicationId, tenantId: input.tenantId },
    include: { conversation: { select: { teamId: true } } },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  if (!canTransitionCommunicationStatus(row.status, "ARCHIVED")) {
    throw new TeamCommunicationValidationError("invalid status transition");
  }

  await prisma.platformCommunication.update({
    where: { id: row.id },
    data: { status: "ARCHIVED" },
  });

  await recordPlatformCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "COMMUNICATION_ARCHIVED",
    communicationId: row.id,
    teamId: row.conversation.teamId ?? undefined,
    kind: row.kind,
    status: "ARCHIVED",
  });
}

export async function getTeamCommunicationById(input: {
  tenantId: string;
  communicationId: string;
}): Promise<TeamCommunicationListItem | null> {
  const row = await prisma.platformCommunication.findFirst({
    where: { id: input.communicationId, tenantId: input.tenantId },
    include: COMMUNICATION_LIST_INCLUDE,
  });
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    bodyText: row.bodyText,
    subject: row.subject,
    acknowledgementRequired: row.acknowledgementRequired,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    senderPerson: row.senderPerson,
  };
}

export function assertTenantScopedCommunication(
  tenantId: string,
  rowTenantId: string,
): void {
  if (tenantId !== rowTenantId) {
    throw new TeamCommunicationForbiddenError();
  }
}

/** Validates ANNOUNCEMENT/ALERT seams without enabling full UX in COMM-04. */
export function validateCommunicationKindSeam(kind: string): void {
  assertKindSupportedForFoundation(kind);
}

export function defaultTeamOperationalAudienceSpec(teamId: string) {
  return teamAudienceSpecForPreset(teamId, "ALL");
}

export function fingerprintAudience(
  audience: import("@/lib/communication/platform/audience/zielgruppe-definition").CommunicationAudienceSpec,
): string {
  return computeAudienceFingerprint(audience);
}
