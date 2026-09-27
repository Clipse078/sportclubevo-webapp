/**
 * SCE-COMM-12 — audience preview (COMM-03) and recipient-facing content preview.
 */

import { prisma } from "@/lib/db/prisma";
import { previewClubCommunicationAudience } from "@/lib/communication/club/club-preview-service";
import { createOrganisationCommunicationContext } from "@/lib/communication/club/club-communication-context";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import {
  defaultCampaignOrchestrationMeta,
  parseCampaignOrchestrationMeta,
} from "@/lib/communication/campaign/campaign-orchestration-meta";
import { CAMPAIGN_BOUNDARY_FLAGS } from "@/lib/communication/campaign/campaign-boundaries";
import { aggregateSponsorAudiencePreview } from "@/lib/communication/sponsor/sponsor-audience-preview";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
} from "@/lib/communication/team/team-communication-errors";

export async function previewCampaignAudience(input: {
  tenantId: string;
  senderUserId: string;
  audience: CommunicationAudienceSpec;
  includeRecipientDetail?: boolean;
}) {
  const base = await previewClubCommunicationAudience({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    audience: input.audience,
    context: createOrganisationCommunicationContext(input.tenantId),
    category: "CLUB_INFORMATION",
    includeRecipientDetail: input.includeRecipientDetail,
  });
  const sponsorAggregate = await aggregateSponsorAudiencePreview({
    tenantId: input.tenantId,
    audience: input.audience,
  });
  return {
    ...base,
    sponsorAudience: sponsorAggregate,
    deliveryBoundaries: CAMPAIGN_BOUNDARY_FLAGS,
  };
}

export async function previewCampaignContent(input: {
  tenantId: string;
  campaignId: string;
  viewerCanSend: boolean;
}) {
  const row = await prisma.platformCommunication.findFirst({
    where: {
      id: input.campaignId,
      tenantId: input.tenantId,
      kind: "CAMPAIGN",
    },
    include: {
      attachmentLinks: {
        select: {
          id: true,
          attachment: { select: { id: true, originalFilename: true, contentType: true } },
        },
      },
    },
  });
  if (!row) throw new TeamCommunicationNotFoundError();
  if (!input.viewerCanSend && (row.status === "DRAFT" || row.status === "READY")) {
    throw new TeamCommunicationForbiddenError();
  }

  const orchestration =
    parseCampaignOrchestrationMeta(row.orchestrationMetaJson) ?? defaultCampaignOrchestrationMeta();

  return {
    kind: "CAMPAIGN" as const,
    context: { kind: "ORGANISATION" as const, tenantId: input.tenantId },
    internalName: row.internalName,
    title: row.subject,
    bodyText: row.bodyText,
    attachments: row.attachmentLinks.map((link) => ({
      linkId: link.id,
      attachmentId: link.attachment.id,
      fileName: link.attachment.originalFilename,
      mimeType: link.attachment.contentType,
    })),
    channels: orchestration.channels,
    boundaries: CAMPAIGN_BOUNDARY_FLAGS,
  };
}
