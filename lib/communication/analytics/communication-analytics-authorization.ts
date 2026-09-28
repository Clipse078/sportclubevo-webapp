/**
 * SCE-COMM-19 — analytics authorization (tenant-scoped, fail closed).
 */

import { prisma } from "@/lib/db/prisma";
import { resolveClubCommunicationAuthorization } from "@/lib/communication/club/club-communication-authorization";
import { resolveTeamCommunicationAuthorization } from "@/lib/communication/team/team-communication-authorization";
import { canInspectClubCommunicationEngagementDetail } from "@/lib/communication/club/club-formal-communication-service";
import { canInspectCampaignEngagementDetail } from "@/lib/communication/campaign/campaign-engagement-service";
import { canInspectTeamCommunicationEngagementDetail } from "@/lib/communication/team/team-formal-communication-service";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
} from "@/lib/communication/team/team-communication-errors";

export type CommunicationAnalyticsContext =
  | { scope: "ORGANISATION"; teamId: null }
  | { scope: "TEAM"; teamId: string };

export type CommunicationAnalyticsAccess = {
  communicationId: string;
  tenantId: string;
  context: CommunicationAnalyticsContext;
  canViewSummary: boolean;
  canViewRecipientDetail: boolean;
};

export async function resolveCommunicationAnalyticsAccess(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  communicationId: string;
}): Promise<CommunicationAnalyticsAccess | null> {
  const row = await prisma.platformCommunication.findFirst({
    where: { id: input.communicationId, tenantId: input.tenantId },
    select: {
      id: true,
      kind: true,
      conversation: { select: { contextKind: true, teamId: true } },
    },
  });
  if (!row) return null;

  const teamId = row.conversation.teamId;
  const isTeam = row.conversation.contextKind === "TEAM" && teamId;

  if (isTeam) {
    const teamAuth = await resolveTeamCommunicationAuthorization({
      tenantId: input.tenantId,
      tenantKey: input.tenantKey,
      userId: input.userId,
      teamId,
    });
    if (!teamAuth?.canView) {
      return {
        communicationId: row.id,
        tenantId: input.tenantId,
        context: { scope: "TEAM", teamId },
        canViewSummary: false,
        canViewRecipientDetail: false,
      };
    }
    const canViewRecipientDetail = await canInspectTeamCommunicationEngagementDetail({
      tenantId: input.tenantId,
      teamId,
      communicationId: row.id,
      viewerUserId: input.userId,
      viewerCanSend: teamAuth.canSend,
    });
    return {
      communicationId: row.id,
      tenantId: input.tenantId,
      context: { scope: "TEAM", teamId },
      canViewSummary: true,
      canViewRecipientDetail,
    };
  }

  const clubAuth = await resolveClubCommunicationAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
  });

  if (!clubAuth.canView) {
    return {
      communicationId: row.id,
      tenantId: input.tenantId,
      context: { scope: "ORGANISATION", teamId: null },
      canViewSummary: false,
      canViewRecipientDetail: false,
    };
  }

  const canViewRecipientDetail =
    row.kind === "CAMPAIGN"
      ? await canInspectCampaignEngagementDetail({
          tenantId: input.tenantId,
          campaignId: row.id,
          viewerUserId: input.userId,
          viewerCanViewEngagementDetail: clubAuth.canViewEngagementDetail,
        })
      : await canInspectClubCommunicationEngagementDetail({
          tenantId: input.tenantId,
          communicationId: row.id,
          viewerUserId: input.userId,
          viewerCanViewEngagementDetail: clubAuth.canViewEngagementDetail,
        });

  return {
    communicationId: row.id,
    tenantId: input.tenantId,
    context: { scope: "ORGANISATION", teamId: null },
    canViewSummary: true,
    canViewRecipientDetail,
  };
}

export async function requireCommunicationAnalyticsSummary(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  communicationId: string;
}): Promise<CommunicationAnalyticsAccess> {
  const access = await resolveCommunicationAnalyticsAccess(input);
  if (!access) throw new TeamCommunicationNotFoundError();
  if (!access.canViewSummary) throw new TeamCommunicationForbiddenError("ANALYTICS_VIEW_DENIED");
  return access;
}
