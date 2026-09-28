/**
 * SCE-COMM-11 — Club communication application service (presentation-independent).
 *
 * Dynamic audiences resolve at publish time; draft save stores audience intent only.
 */

import type { PlatformCommunicationKind, PlatformCommunicationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isCommunicationKind } from "@/lib/communication/platform/communication-kinds";
import { validateCommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { validateCommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-validation";
import { resolveCommunicationRecipientsForDispatch } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import {
  createOrganisationCommunicationContext,
  getOrCreateOrganisationCommunicationConversation,
} from "@/lib/communication/club/club-communication-context";
import {
  assertTenantOwnedStructuralSelectors,
  assertTenantOwnedTargetGroupIds,
} from "@/lib/communication/club/club-audience-spec";
import { assertTenantOwnedSponsorAudienceSelectors } from "@/lib/sponsoring/sponsor-audience-ownership";
import { sponsorSelectorsAreEmpty } from "@/lib/sponsoring/sponsor-audience-selectors";
import { buildCampaignPublishSnapshotCreateMany } from "@/lib/communication/sponsor/publish-recipient-snapshot-data";
import { summarizeClubAudienceSpec } from "@/lib/communication/club/club-audience-summary";
import { syncPlatformCommunicationAttachments } from "@/lib/communication/attachment-service";
import {
  canTransitionCommunicationStatus,
  communicationAudienceMutable,
} from "@/lib/communication/team/team-communication-lifecycle";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { recordPlatformCommunicationAudit } from "@/lib/communication/team/platform-communication-audit";
import { emitClubCommunicationPublishedNotifications } from "@/lib/communication/club/club-communication-notification-producer";
import { resolveCommunicationChannelIntent } from "@/lib/communication/platform-email/communication-channel-intent";
import { evaluatePlatformEmailReadiness } from "@/lib/communication/platform-email/email-readiness-service";
import { enqueuePlatformCommunicationEmailDeliveries } from "@/lib/communication/platform-email/platform-email-dispatch-service";
import { resolvePersonIdForUser } from "@/lib/teams/team-document-auth";
import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import {
  applyPersonalSignatureToOutboundBody,
  personalSignatureSupportedForMitteilungKind,
} from "@/lib/communication/personal-signature/personal-signature-service";

export type ClubCommunicationListItem = {
  id: string;
  kind: PlatformCommunicationKind;
  status: string;
  bodyText: string;
  subject: string | null;
  acknowledgementRequired: boolean;
  publishedAt: string | null;
  createdAt: string;
  audienceSummary: string;
  senderPerson: { id: string; firstName: string; lastName: string; displayName?: string | null } | null;
  scheduleStatus?: string | null;
  scheduledAt?: string | null;
  deliverySnapshotCount?: number | null;
};

export type ClubCommunicationDetail = ClubCommunicationListItem & {
  audienceSpec: CommunicationAudienceSpec;
};

const CLUB_KINDS = new Set<PlatformCommunicationKind>(["MESSAGE", "ANNOUNCEMENT", "ALERT"]);

const LIST_INCLUDE = {
  senderPerson: { select: { id: true, firstName: true, lastName: true, displayName: true } },
  _count: { select: { recipientSnapshots: true } },
} satisfies Prisma.PlatformCommunicationInclude;

function sanitizeBodyText(body: string): string {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed) throw new TeamCommunicationValidationError("body is required");
  if (trimmed.length > MAX_TEAM_COMMUNICATION_BODY_LENGTH) {
    throw new TeamCommunicationValidationError("body exceeds maximum length");
  }
  return trimmed;
}

function assertClubKind(kind: string): PlatformCommunicationKind {
  if (!isCommunicationKind(kind)) {
    throw new TeamCommunicationValidationError("invalid communication kind");
  }
  if (!CLUB_KINDS.has(kind as PlatformCommunicationKind)) {
    throw new TeamCommunicationValidationError(`kind ${kind} is not enabled for club communication`);
  }
  return kind as PlatformCommunicationKind;
}

async function loadClubCommunicationRow(input: { tenantId: string; communicationId: string }) {
  const row = await prisma.platformCommunication.findFirst({
    where: { id: input.communicationId, tenantId: input.tenantId },
    include: {
      conversation: { select: { contextKind: true, teamId: true } },
    },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  if (row.conversation.contextKind !== "ORGANISATION" || row.conversation.teamId !== null) {
    throw new TeamCommunicationNotFoundError();
  }
  return row;
}

async function validateAudienceTenantOwnership(
  tenantId: string,
  audience: CommunicationAudienceSpec,
): Promise<void> {
  for (const component of audience.components) {
    if (component.savedTargetGroupIds?.length) {
      await assertTenantOwnedTargetGroupIds({
        tenantId,
        targetGroupIds: component.savedTargetGroupIds,
      });
    }
    if (component.structural) {
      await assertTenantOwnedStructuralSelectors({ tenantId, selectors: component.structural });
    }
    if (component.sponsor && !sponsorSelectorsAreEmpty(component.sponsor)) {
      await assertTenantOwnedSponsorAudienceSelectors({ tenantId, selectors: component.sponsor });
    }
  }
}

export async function listClubCommunications(input: {
  tenantId: string;
  limit?: number;
  status?: string;
  kind?: string;
  search?: string;
  senderPersonId?: string;
  viewerUserId: string;
  viewerCanSend: boolean;
}): Promise<ClubCommunicationListItem[]> {
  const conversation = await getOrCreateOrganisationCommunicationConversation({
    tenantId: input.tenantId,
  });

  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const statusFilter: PlatformCommunicationStatus | undefined =
    input.status === "DRAFT" || input.status === "PUBLISHED" || input.status === "ARCHIVED"
      ? input.status
      : undefined;

  const allowedStatuses: PlatformCommunicationStatus[] = input.viewerCanSend
    ? statusFilter
      ? [statusFilter]
      : ["PUBLISHED", "DRAFT", "ARCHIVED"]
    : statusFilter && statusFilter !== "DRAFT"
      ? [statusFilter]
      : ["PUBLISHED", "ARCHIVED"];

  const rows = await prisma.platformCommunication.findMany({
    where: {
      tenantId: input.tenantId,
      conversationId: conversation.id,
      kind: input.kind ? assertClubKind(input.kind) : { not: "CAMPAIGN" },
      status: { in: allowedStatuses },
      ...(input.senderPersonId ? { senderPersonId: input.senderPersonId } : {}),
      ...(input.search?.trim()
        ? {
            OR: [
              { subject: { contains: input.search.trim(), mode: "insensitive" as const } },
              { bodyText: { contains: input.search.trim(), mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: LIST_INCLUDE,
  });

  const communicationIds = rows.map((row) => row.id);
  const activeSchedules =
    communicationIds.length > 0
      ? await prisma.platformCommunicationPublicationSchedule.findMany({
          where: {
            tenantId: input.tenantId,
            communicationId: { in: communicationIds },
            status: { in: ["SCHEDULED", "PROCESSING"] },
          },
          select: { communicationId: true, status: true, scheduledAt: true },
        })
      : [];
  const scheduleByCommunicationId = new Map(
    activeSchedules.map((schedule) => [schedule.communicationId, schedule]),
  );

  return rows.map((row) => {
    const audience = row.audienceSpecJson as CommunicationAudienceSpec;
    const schedule = scheduleByCommunicationId.get(row.id);
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      bodyText: row.bodyText,
      subject: row.subject,
      acknowledgementRequired: row.acknowledgementRequired,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      audienceSummary: summarizeClubAudienceSpec(audience),
      senderPerson: row.senderPerson,
      scheduleStatus: schedule?.status ?? null,
      scheduledAt: schedule?.scheduledAt.toISOString() ?? null,
      deliverySnapshotCount:
        row.status === "PUBLISHED" ? row._count.recipientSnapshots : null,
    };
  });
}

export async function createClubCommunicationDraft(input: {
  tenantId: string;
  senderUserId: string;
  kind?: string;
  bodyText: string;
  subject?: string | null;
  audienceSpec: CommunicationAudienceSpec;
  contextRef?: CommunicationContextRef;
  acknowledgementRequired?: boolean;
}): Promise<{ id: string }> {
  const kind = assertClubKind(input.kind ?? "MESSAGE");
  const bodyText = sanitizeBodyText(input.bodyText);
  const contextRef = input.contextRef ?? createOrganisationCommunicationContext(input.tenantId);
  const ctxErr = validateCommunicationContextRef(input.tenantId, contextRef);
  if (ctxErr) throw new TeamCommunicationValidationError(ctxErr);

  const audienceErr = validateCommunicationAudienceSpec(input.audienceSpec);
  if (audienceErr) throw new TeamCommunicationValidationError(audienceErr);
  await validateAudienceTenantOwnership(input.tenantId, input.audienceSpec);

  const conversation = await getOrCreateOrganisationCommunicationConversation({
    tenantId: input.tenantId,
  });
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
      audienceSpecJson: input.audienceSpec as unknown as Prisma.InputJsonValue,
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
    kind: created.kind,
    status: created.status,
  });

  return { id: created.id };
}

export async function updateClubCommunicationDraft(input: {
  tenantId: string;
  communicationId: string;
  actorUserId: string;
  bodyText?: string;
  subject?: string | null;
  audienceSpec?: CommunicationAudienceSpec;
  acknowledgementRequired?: boolean;
  attachmentIds?: string[];
}): Promise<{ id: string }> {
  const row = await loadClubCommunicationRow({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });
  if (row.status !== "DRAFT") {
    throw new TeamCommunicationValidationError("only drafts can be edited");
  }
  if (row.createdByUserId && row.createdByUserId !== input.actorUserId) {
    throw new TeamCommunicationForbiddenError("draft edit denied");
  }

  const data: Prisma.PlatformCommunicationUpdateInput = {};
  if (input.bodyText !== undefined) data.bodyText = sanitizeBodyText(input.bodyText);
  if (input.subject !== undefined) data.subject = input.subject?.trim() || null;
  if (input.acknowledgementRequired !== undefined) {
    data.acknowledgementRequired = input.acknowledgementRequired === true;
  }
  if (input.audienceSpec) {
    const audienceErr = validateCommunicationAudienceSpec(input.audienceSpec);
    if (audienceErr) throw new TeamCommunicationValidationError(audienceErr);
    await validateAudienceTenantOwnership(input.tenantId, input.audienceSpec);
    data.audienceSpecJson = input.audienceSpec as unknown as Prisma.InputJsonValue;
  }

  await prisma.platformCommunication.update({ where: { id: row.id }, data });

  if (input.attachmentIds !== undefined) {
    await syncPlatformCommunicationAttachments({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      communicationId: row.id,
      attachmentIds: input.attachmentIds,
    });
  }

  await recordPlatformCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "COMMUNICATION_UPDATED",
    communicationId: row.id,
    kind: row.kind,
    status: row.status,
  });

  return { id: row.id };
}

export async function publishClubCommunication(input: {
  tenantId: string;
  communicationId: string;
  senderUserId: string;
  includePersonalSignature?: boolean;
}): Promise<{ id: string; recipientCount: number }> {
  const row = await loadClubCommunicationRow({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });
  if (!canTransitionCommunicationStatus(row.status, "PUBLISHED")) {
    throw new TeamCommunicationValidationError("invalid status transition");
  }

  if (personalSignatureSupportedForMitteilungKind(row.kind)) {
    try {
      const withSignature = await applyPersonalSignatureToOutboundBody({
        tenantId: input.tenantId,
        userId: input.senderUserId,
        messageBody: row.bodyText,
        includePersonalSignature: input.includePersonalSignature,
      });
      if (withSignature !== row.bodyText) {
        await prisma.platformCommunication.update({
          where: { id: row.id },
          data: { bodyText: sanitizeBodyText(withSignature) },
        });
        row.bodyText = withSignature;
      }
    } catch {
      throw new TeamCommunicationValidationError("body exceeds maximum length");
    }
  }

  const audience = row.audienceSpecJson as CommunicationAudienceSpec;
  if (communicationAudienceMutable(row.status)) {
    const audienceErr = validateCommunicationAudienceSpec(audience);
    if (audienceErr) throw new TeamCommunicationValidationError(audienceErr);
    await validateAudienceTenantOwnership(input.tenantId, audience);
  }

  const contextRef = row.contextRef as CommunicationContextRef;
  const category =
    row.kind === "ALERT" ? "CLUB_OPERATIONAL" : row.kind === "ANNOUNCEMENT" ? "CLUB_INFORMATION" : "CLUB_OPERATIONAL";

  const dispatch = await resolveCommunicationRecipientsForDispatch(
    {
      tenantId: input.tenantId,
      senderActor: { userId: input.senderUserId },
      audience,
      context: contextRef,
      channel: "IN_APP",
      category,
      mode: "DISPATCH",
    },
    input.communicationId,
  );

  const fingerprint = dispatch.core.metadata.audienceFingerprint;
  const channelIntent = resolveCommunicationChannelIntent({
    orchestrationMetaJson: row.orchestrationMetaJson,
  });
  const emailReadiness = await evaluatePlatformEmailReadiness(input.tenantId);
  const publishSnapshots = await buildCampaignPublishSnapshotCreateMany({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
    audience,
    audienceFingerprint: fingerprint,
    resolvedAt: dispatch.core.metadata.resolvedAt,
    deliveryTargets: dispatch.pipeline.deliveryTargets,
    emailChannelEnabled: channelIntent.email,
    emailTransportReady: emailReadiness.ready,
  });

  if (publishSnapshots.totalCount === 0) {
    throw new TeamCommunicationValidationError("no eligible recipients for dispatch");
  }

  const publishedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.platformCommunication.update({
      where: { id: row.id },
      data: {
        status: "PUBLISHED",
        publishedAt,
        audienceFingerprint: fingerprint,
      },
    });

    await tx.platformCommunicationRecipientSnapshot.createMany({
      data: publishSnapshots.createManyData.map((snap) => ({
        ...snap,
        communicationId: row.id,
      })),
      skipDuplicates: true,
    });

    await emitClubCommunicationPublishedNotifications(tx, {
      tenantId: input.tenantId,
      communicationId: row.id,
      kind: row.kind,
      title: row.subject?.trim() || defaultTitleForKind(row.kind),
      bodyPreview: row.bodyText.slice(0, 240),
      deliveryUserIds: publishSnapshots.deliveryUserIds,
      excludeUserIds: [input.senderUserId],
    });
  });

  await recordPlatformCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.senderUserId,
    action: "COMMUNICATION_PUBLISHED",
    communicationId: row.id,
    kind: row.kind,
    status: "PUBLISHED",
  });

  try {
    await enqueuePlatformCommunicationEmailDeliveries({
      tenantId: input.tenantId,
      communicationId: row.id,
      channelIntent,
      category,
      actorUserId: input.senderUserId,
      communicationKind: row.kind,
    });
  } catch (error) {
    console.error("[platform-email] enqueue after club publish failed", {
      communicationId: row.id,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  return { id: row.id, recipientCount: publishSnapshots.totalCount };
}

function defaultTitleForKind(kind: PlatformCommunicationKind): string {
  if (kind === "ANNOUNCEMENT") return "Vereins-Mitteilung";
  if (kind === "ALERT") return "Vereins-Alarm";
  return "Vereins-Nachricht";
}

export async function archiveClubCommunication(input: {
  tenantId: string;
  communicationId: string;
  actorUserId: string;
}): Promise<void> {
  const row = await loadClubCommunicationRow({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });
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
    kind: row.kind,
    status: "ARCHIVED",
  });
}

export async function getClubCommunicationById(input: {
  tenantId: string;
  communicationId: string;
  viewerCanSend: boolean;
}): Promise<ClubCommunicationDetail | null> {
  const row = await loadClubCommunicationRow({
    tenantId: input.tenantId,
    communicationId: input.communicationId,
  });
  if (!input.viewerCanSend && row.status === "DRAFT") {
    throw new TeamCommunicationForbiddenError();
  }

  const full = await prisma.platformCommunication.findFirst({
    where: { id: row.id },
    include: LIST_INCLUDE,
  });
  if (!full) return null;

  const audience = full.audienceSpecJson as CommunicationAudienceSpec;
  const schedule = await prisma.platformCommunicationPublicationSchedule.findFirst({
    where: {
      tenantId: input.tenantId,
      communicationId: full.id,
      status: { in: ["SCHEDULED", "PROCESSING"] },
    },
    select: { status: true, scheduledAt: true },
  });
  return {
    id: full.id,
    kind: full.kind,
    status: full.status,
    bodyText: full.bodyText,
    subject: full.subject,
    acknowledgementRequired: full.acknowledgementRequired,
    publishedAt: full.publishedAt?.toISOString() ?? null,
    createdAt: full.createdAt.toISOString(),
    audienceSummary: summarizeClubAudienceSpec(audience),
    senderPerson: full.senderPerson,
    scheduleStatus: schedule?.status ?? null,
    scheduledAt: schedule?.scheduledAt.toISOString() ?? null,
    deliverySnapshotCount:
      full.status === "PUBLISHED" ? full._count.recipientSnapshots : null,
    audienceSpec: audience,
  };
}
