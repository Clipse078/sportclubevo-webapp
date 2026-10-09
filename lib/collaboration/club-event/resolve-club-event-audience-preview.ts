/**
 * SCE-COLLAB-01C — recipient preview + send authorization for club event collaboration.
 */

import { eventCommunicationContext } from "@/lib/communication/platform/seams/event-communication-seam";
import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { resolveContextualCommunicationSendAuthorization } from "@/lib/collaboration/contextual-communication-authorization";
import { resolveClubCommunicationAuthorization } from "@/lib/communication/club/club-communication-authorization";
import type { ResolvedClubEventAudience } from "@/lib/collaboration/club-event/resolve-club-event-audience";
import type { ClubEventCommunicationScope } from "@/lib/collaboration/club-event/club-event-audience-presentation";

export type { ClubEventCommunicationScope } from "@/lib/collaboration/club-event/club-event-audience-presentation";

export async function resolveClubEventCommunicationScope(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  audienceContext: ResolvedClubEventAudience;
}): Promise<{ scope: ClubEventCommunicationScope; canCommunicate: boolean }> {
  const path = input.audienceContext.communicationPath;

  if (path === "TEAM" && input.audienceContext.primaryTeamId) {
    const teamAuth = await resolveContextualCommunicationSendAuthorization({
      tenantId: input.tenantId,
      tenantKey: input.tenantKey,
      userId: input.userId,
      teamId: input.audienceContext.primaryTeamId,
    });
    if (teamAuth.canCommunicate) {
      return { scope: "TEAM", canCommunicate: true };
    }
    return { scope: "TEAM", canCommunicate: false };
  }

  const clubAuth = await resolveClubCommunicationAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
  });
  if (clubAuth.canSend) {
    return { scope: "CLUB", canCommunicate: true };
  }

  return { scope: path, canCommunicate: false };
}

export async function resolveClubEventAudiencePreview(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  eventId: string;
  audienceContext: ResolvedClubEventAudience;
}): Promise<{
  canCommunicate: boolean;
  communicationScope: ClubEventCommunicationScope;
  audience: ActivityChangeImpact["audience"];
}> {
  const { scope, canCommunicate } = await resolveClubEventCommunicationScope({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
    audienceContext: input.audienceContext,
  });

  let effectiveRecipientCount: number | null = null;
  let zeroRecipients = false;
  let recipientPreviewLabel: string | null = null;

  if (canCommunicate) {
    try {
      const resolution = await resolveCommunicationRecipients({
        tenantId: input.tenantId,
        senderActor: { userId: input.userId },
        audience: input.audienceContext.audienceSpec,
        context: eventCommunicationContext(input.eventId),
        channel: "IN_APP",
        category: "TEAM_OPERATIONAL",
        mode: "PREVIEW",
      });
      effectiveRecipientCount = resolution.summary.effectiveCount;
      zeroRecipients = effectiveRecipientCount === 0;
      const labelBase = input.audienceContext.audienceLabel;
      recipientPreviewLabel =
        effectiveRecipientCount > 0
          ? `${labelBase} · ${effectiveRecipientCount} Empfänger`
          : labelBase;
    } catch {
      effectiveRecipientCount = null;
      zeroRecipients = false;
      recipientPreviewLabel = input.audienceContext.audienceLabel;
    }
  }

  const anchorTeamId = input.audienceContext.primaryTeamId ?? input.eventId;

  const audience: NonNullable<ActivityChangeImpact["audience"]> = {
    teamId: anchorTeamId,
    teamName: input.audienceContext.teamName,
    teamNamesLabel: input.audienceContext.teamNamesLabel ?? input.audienceContext.audienceLabel,
    recipientPreviewLabel,
    effectiveRecipientCount,
    zeroRecipients,
    teamIds:
      input.audienceContext.teamIds.length > 1 ? input.audienceContext.teamIds : undefined,
  };

  return { canCommunicate, communicationScope: scope, audience };
}
