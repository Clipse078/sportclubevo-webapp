/**
 * SCE-COMM-12 — Campaign composer service (PlatformCommunication kind CAMPAIGN).
 */

import type { PlatformCommunicationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
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
import { resolvePersonIdForUser } from "@/lib/teams/team-document-auth";
import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import {
  defaultCampaignOrchestrationMeta,
  parseCampaignOrchestrationMeta,
  type CampaignOrchestrationMeta,
} from "@/lib/communication/campaign/campaign-orchestration-meta";
import { emitCampaignPublishedNotifications } from "@/lib/communication/campaign/campaign-notification-producer";

export type CampaignListItem = {
  id: string;
  internalName: string;
  status: PlatformCommunicationStatus;
  subject: string | null;
  bodyText: string;
  audienceSummary: string;
  authorPerson: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  recipientCount: number | null;
};

const CAMPAIGN_KIND = "CAMPAIGN" as const;

const LIST_INCLUDE = {
  senderPerson: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { recipientSnapshots: true } },
} satisfies Prisma.PlatformCommunicationInclude;

function sanitizeInternalName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new TeamCommunicationValidationError("internal campaign name is required");
  if (trimmed.length > 160) {
    throw new TeamCommunicationValidationError("internal campaign name exceeds maximum length");
  }
  return trimmed;
}

function sanitizeSubject(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length > 240) {
    throw new TeamCommunicationValidationError("title exceeds maximum length");
  }
  return trimmed || null;
}

function sanitizeBodyText(body: string): string {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed) throw new TeamCommunicationValidationError("body is required");
  if (trimmed.length > MAX_TEAM_COMMUNICATION_BODY_LENGTH) {
    throw new TeamCommunicationValidationError("body exceeds maximum length");
  }
  return trimmed;
}

async function loadCampaignRow(input: { tenantId: string; campaignId: string }) {
  const row = await prisma.platformCommunication.findFirst({
    where: {
      id: input.campaignId,
      tenantId: input.tenantId,
      kind: CAMPAIGN_KIND,
    },
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

function mapListRow(
  row: Prisma.PlatformCommunicationGetPayload<{ include: typeof LIST_INCLUDE }>,
): CampaignListItem {
  const audience = row.audienceSpecJson as CommunicationAudienceSpec;
  const internalName =
    row.internalName?.trim() ||
    row.subject?.trim() ||
    row.bodyText.slice(0, 80).trim() ||
    "Kampagne";
  return {
    id: row.id,
    internalName,
    status: row.status,
    subject: row.subject,
    bodyText: row.bodyText,
    audienceSummary: summarizeClubAudienceSpec(audience),
    authorPerson: row.senderPerson,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    recipientCount: row.status === "PUBLISHED" ? row._count.recipientSnapshots : null,
  };
}

export async function listCampaigns(input: {
  tenantId: string;
  limit?: number;
  status?: string;
  search?: string;
  viewerUserId: string;
  viewerCanSend: boolean;
}): Promise<CampaignListItem[]> {
  const conversation = await getOrCreateOrganisationCommunicationConversation({
    tenantId: input.tenantId,
  });

  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const statusFilter: PlatformCommunicationStatus | undefined =
    input.status === "DRAFT" ||
    input.status === "READY" ||
    input.status === "PUBLISHED" ||
    input.status === "ARCHIVED"
      ? input.status
      : undefined;

  const allowedStatuses: PlatformCommunicationStatus[] = input.viewerCanSend
    ? statusFilter
      ? [statusFilter]
      : ["PUBLISHED", "READY", "DRAFT", "ARCHIVED"]
    : statusFilter && statusFilter !== "DRAFT" && statusFilter !== "READY"
      ? [statusFilter]
      : ["PUBLISHED", "ARCHIVED"];

  const rows = await prisma.platformCommunication.findMany({
    where: {
      tenantId: input.tenantId,
      conversationId: conversation.id,
      kind: CAMPAIGN_KIND,
      status: { in: allowedStatuses },
      ...(input.search?.trim()
        ? {
            OR: [
              { internalName: { contains: input.search.trim(), mode: "insensitive" as const } },
              { subject: { contains: input.search.trim(), mode: "insensitive" as const } },
              { bodyText: { contains: input.search.trim(), mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
    include: LIST_INCLUDE,
  });

  return rows.map(mapListRow);
}

export async function getCampaignById(input: {
  tenantId: string;
  campaignId: string;
  viewerCanSend: boolean;
}): Promise<(CampaignListItem & { audienceSpec: CommunicationAudienceSpec; orchestration: CampaignOrchestrationMeta }) | null> {
  const row = await loadCampaignRow({ tenantId: input.tenantId, campaignId: input.campaignId });
  if (!input.viewerCanSend && (row.status === "DRAFT" || row.status === "READY")) {
    throw new TeamCommunicationForbiddenError();
  }

  const full = await prisma.platformCommunication.findFirst({
    where: { id: row.id },
    include: LIST_INCLUDE,
  });
  if (!full) return null;

  const audience = full.audienceSpecJson as CommunicationAudienceSpec;
  const orchestration =
    parseCampaignOrchestrationMeta(full.orchestrationMetaJson) ?? defaultCampaignOrchestrationMeta();

  return {
    ...mapListRow(full),
    audienceSpec: audience,
    orchestration,
  };
}

export async function createCampaignDraft(input: {
  tenantId: string;
  senderUserId: string;
  internalName: string;
  subject?: string | null;
  bodyText: string;
  audienceSpec: CommunicationAudienceSpec;
  contextRef?: CommunicationContextRef;
}): Promise<{ id: string }> {
  const internalName = sanitizeInternalName(input.internalName);
  const bodyText = sanitizeBodyText(input.bodyText);
  const subject = sanitizeSubject(input.subject);
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
      kind: CAMPAIGN_KIND,
      status: "DRAFT",
      contextRef: contextRef as unknown as Prisma.InputJsonValue,
      senderPersonId,
      internalName,
      subject,
      bodyText,
      audienceSpecJson: input.audienceSpec as unknown as Prisma.InputJsonValue,
      orchestrationMetaJson: defaultCampaignOrchestrationMeta() as unknown as Prisma.InputJsonValue,
      acknowledgementRequired: false,
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

export async function updateCampaignDraft(input: {
  tenantId: string;
  campaignId: string;
  actorUserId: string;
  internalName?: string;
  subject?: string | null;
  bodyText?: string;
  audienceSpec?: CommunicationAudienceSpec;
}): Promise<{ id: string }> {
  const row = await loadCampaignRow({ tenantId: input.tenantId, campaignId: input.campaignId });
  if (row.status !== "DRAFT" && row.status !== "READY") {
    throw new TeamCommunicationValidationError("only draft or ready campaigns can be edited");
  }
  if (row.createdByUserId && row.createdByUserId !== input.actorUserId) {
    throw new TeamCommunicationForbiddenError("campaign edit denied");
  }

  const data: Prisma.PlatformCommunicationUpdateInput = {};
  if (input.internalName !== undefined) data.internalName = sanitizeInternalName(input.internalName);
  if (input.bodyText !== undefined) data.bodyText = sanitizeBodyText(input.bodyText);
  if (input.subject !== undefined) data.subject = sanitizeSubject(input.subject);
  if (input.audienceSpec) {
    const audienceErr = validateCommunicationAudienceSpec(input.audienceSpec);
    if (audienceErr) throw new TeamCommunicationValidationError(audienceErr);
    await validateAudienceTenantOwnership(input.tenantId, input.audienceSpec);
    data.audienceSpecJson = input.audienceSpec as unknown as Prisma.InputJsonValue;
  }

  await prisma.platformCommunication.update({ where: { id: row.id }, data });

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

export async function markCampaignReady(input: {
  tenantId: string;
  campaignId: string;
  actorUserId: string;
}): Promise<{ id: string; status: PlatformCommunicationStatus }> {
  const row = await loadCampaignRow({ tenantId: input.tenantId, campaignId: input.campaignId });
  if (!canTransitionCommunicationStatus(row.status, "READY")) {
    throw new TeamCommunicationValidationError("invalid status transition");
  }
  if (row.status === "READY") return { id: row.id, status: row.status };

  await prisma.platformCommunication.update({
    where: { id: row.id },
    data: { status: "READY" },
  });

  await recordPlatformCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "COMMUNICATION_UPDATED",
    communicationId: row.id,
    kind: row.kind,
    status: "READY",
  });

  return { id: row.id, status: "READY" };
}

export type PublishCampaignResult = {
  id: string;
  recipientCount: number;
  alreadyPublished: boolean;
};

export async function publishCampaign(input: {
  tenantId: string;
  campaignId: string;
  senderUserId: string;
}): Promise<PublishCampaignResult> {
  const row = await loadCampaignRow({ tenantId: input.tenantId, campaignId: input.campaignId });

  if (row.status === "PUBLISHED") {
    const recipientCount = await prisma.platformCommunicationRecipientSnapshot.count({
      where: { tenantId: input.tenantId, communicationId: row.id },
    });
    return { id: row.id, recipientCount, alreadyPublished: true };
  }

  if (!canTransitionCommunicationStatus(row.status, "PUBLISHED")) {
    throw new TeamCommunicationValidationError("invalid status transition");
  }

  const audience = row.audienceSpecJson as CommunicationAudienceSpec;
  if (communicationAudienceMutable(row.status)) {
    const audienceErr = validateCommunicationAudienceSpec(audience);
    if (audienceErr) throw new TeamCommunicationValidationError(audienceErr);
    await validateAudienceTenantOwnership(input.tenantId, audience);
  }

  const contextRef = row.contextRef as CommunicationContextRef;

  const dispatch = await resolveCommunicationRecipientsForDispatch(
    {
      tenantId: input.tenantId,
      senderActor: { userId: input.senderUserId },
      audience,
      context: contextRef,
      channel: "IN_APP",
      category: "CLUB_INFORMATION",
      mode: "DISPATCH",
    },
    input.campaignId,
  );

  const fingerprint = dispatch.core.metadata.audienceFingerprint;
  const publishSnapshots = await buildCampaignPublishSnapshotCreateMany({
    tenantId: input.tenantId,
    communicationId: input.campaignId,
    audience,
    audienceFingerprint: fingerprint,
    resolvedAt: dispatch.core.metadata.resolvedAt,
    deliveryTargets: dispatch.pipeline.deliveryTargets,
  });

  if (publishSnapshots.totalCount === 0) {
    throw new TeamCommunicationValidationError("no eligible recipients for dispatch");
  }

  const publishedAt = new Date();
  let published = false;

  await prisma.$transaction(async (tx) => {
    const transition = await tx.platformCommunication.updateMany({
      where: {
        id: row.id,
        tenantId: input.tenantId,
        status: { in: ["DRAFT", "READY"] },
      },
      data: {
        status: "PUBLISHED",
        publishedAt,
        audienceFingerprint: fingerprint,
      },
    });

    if (transition.count === 0) {
      const current = await tx.platformCommunication.findFirst({
        where: { id: row.id, tenantId: input.tenantId },
        select: { status: true },
      });
      if (current?.status === "PUBLISHED") {
        return;
      }
      throw new TeamCommunicationValidationError("campaign publish transition failed");
    }

    published = true;

    await tx.platformCommunicationRecipientSnapshot.createMany({
      data: publishSnapshots.createManyData.map((snap) => ({
        ...snap,
        communicationId: row.id,
      })),
      skipDuplicates: true,
    });

    await emitCampaignPublishedNotifications(tx, {
      tenantId: input.tenantId,
      communicationId: row.id,
      subject: row.subject,
      internalName: row.internalName,
      bodyPreview: row.bodyText.slice(0, 240),
      deliveryUserIds: publishSnapshots.deliveryUserIds,
      excludeUserIds: [input.senderUserId],
    });
  });

  if (!published) {
    const recipientCount = await prisma.platformCommunicationRecipientSnapshot.count({
      where: { tenantId: input.tenantId, communicationId: row.id },
    });
    return { id: row.id, recipientCount, alreadyPublished: true };
  }

  await recordPlatformCommunicationAudit({
    tenantId: input.tenantId,
    actorUserId: input.senderUserId,
    action: "COMMUNICATION_PUBLISHED",
    communicationId: row.id,
    kind: row.kind,
    status: "PUBLISHED",
  });

  return {
    id: row.id,
    recipientCount: publishSnapshots.totalCount,
    alreadyPublished: false,
  };
}

export async function archiveCampaign(input: {
  tenantId: string;
  campaignId: string;
  actorUserId: string;
}): Promise<void> {
  const row = await loadCampaignRow({ tenantId: input.tenantId, campaignId: input.campaignId });
  if (!canTransitionCommunicationStatus(row.status, "ARCHIVED")) {
    throw new TeamCommunicationValidationError("invalid status transition");
  }
  if (row.status === "ARCHIVED") return;

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
