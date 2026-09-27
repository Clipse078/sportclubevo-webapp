/**
 * SCE-COMM-12 — campaign engagement (immutable published snapshots).
 */

import { prisma } from "@/lib/db/prisma";
import {
  TeamCommunicationNotFoundError,
} from "@/lib/communication/team/team-communication-errors";
import { resolvePersonIdForUser } from "@/lib/teams/team-document-auth";

export type CampaignEngagementSummary = {
  campaignId: string;
  recipientCount: number;
  readCount: number;
  acknowledgedCount: number;
  unreadCount: number;
  internalInAppRecipientCount: number;
  externalOrNonDeliverableCount: number;
};

async function loadPublishedCampaign(input: { tenantId: string; campaignId: string }) {
  const row = await prisma.platformCommunication.findFirst({
    where: {
      id: input.campaignId,
      tenantId: input.tenantId,
      kind: "CAMPAIGN",
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

export async function getCampaignEngagementSummary(input: {
  tenantId: string;
  campaignId: string;
}): Promise<CampaignEngagementSummary | null> {
  const row = await loadPublishedCampaign(input);

  const [grouped, kindGrouped] = await Promise.all([
    prisma.platformCommunicationRecipientSnapshot.groupBy({
      by: ["engagement"],
      where: { tenantId: input.tenantId, communicationId: row.id },
      _count: { _all: true },
    }),
    prisma.platformCommunicationRecipientSnapshot.groupBy({
      by: ["recipientKind"],
      where: { tenantId: input.tenantId, communicationId: row.id },
      _count: { _all: true },
    }),
  ]);

  let recipientCount = 0;
  let readCount = 0;
  let acknowledgedCount = 0;
  let internalInAppRecipientCount = 0;
  let externalOrNonDeliverableCount = 0;

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

  for (const entry of kindGrouped) {
    const count = entry._count._all;
    if (entry.recipientKind === "INTERNAL_IN_APP") {
      internalInAppRecipientCount += count;
    } else {
      externalOrNonDeliverableCount += count;
    }
  }

  return {
    campaignId: row.id,
    recipientCount,
    readCount,
    acknowledgedCount,
    unreadCount: Math.max(internalInAppRecipientCount - readCount, 0),
    internalInAppRecipientCount,
    externalOrNonDeliverableCount,
  };
}

export async function canInspectCampaignEngagementDetail(input: {
  tenantId: string;
  campaignId: string;
  viewerUserId: string;
  viewerCanViewEngagementDetail: boolean;
}): Promise<boolean> {
  if (input.viewerCanViewEngagementDetail) return true;
  const row = await loadPublishedCampaign({
    tenantId: input.tenantId,
    campaignId: input.campaignId,
  });
  const senderPersonId = row.senderPersonId;
  if (!senderPersonId) return false;
  const viewerPersonId = await resolvePersonIdForUser(input.viewerUserId, input.tenantId).catch(
    () => null,
  );
  return viewerPersonId !== null && viewerPersonId === senderPersonId;
}
