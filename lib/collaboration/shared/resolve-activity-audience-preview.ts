/**
 * SCE-COLLAB-01B — recipient preview for contextual activity collaboration.
 */

import { eventCommunicationContext } from "@/lib/communication/platform/seams/event-communication-seam";
import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import type {
  ActivityAudienceContext,
  ActivityChangeImpact,
} from "@/lib/collaboration/activity-change/types";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { resolveContextualCommunicationSendAuthorization } from "@/lib/collaboration/contextual-communication-authorization";

export async function resolveActivityAudiencePreview(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  primaryTeamId: string;
  teamIds: string[];
  teamName: string;
  teamNamesLabel?: string | null;
  eventId: string;
  audience: CommunicationAudienceSpec;
}): Promise<{
  canCommunicate: boolean;
  audience: ActivityChangeImpact["audience"];
}> {
  const { canCommunicate } = await resolveContextualCommunicationSendAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
    teamId: input.primaryTeamId,
  });

  let effectiveRecipientCount: number | null = null;
  let zeroRecipients = false;
  let recipientPreviewLabel: string | null = null;

  if (canCommunicate) {
    try {
      const contextRef = eventCommunicationContext(input.eventId);
      const resolution = await resolveCommunicationRecipients({
        tenantId: input.tenantId,
        senderActor: { userId: input.userId },
        audience: input.audience,
        context: contextRef,
        channel: "IN_APP",
        category: "TEAM_OPERATIONAL",
        mode: "PREVIEW",
      });
      effectiveRecipientCount = resolution.summary.effectiveCount;
      zeroRecipients = effectiveRecipientCount === 0;
      const labelBase = input.teamNamesLabel?.trim() || input.teamName;
      recipientPreviewLabel =
        effectiveRecipientCount > 0
          ? `${labelBase} · ${effectiveRecipientCount} Empfänger`
          : labelBase;
    } catch {
      effectiveRecipientCount = null;
      zeroRecipients = false;
      recipientPreviewLabel = input.teamNamesLabel?.trim() || input.teamName;
    }
  }

  const teamNamesLabel = input.teamNamesLabel?.trim() || input.teamName;

  const audience: ActivityAudienceContext = {
    teamId: input.primaryTeamId,
    teamName: input.teamName,
    teamNamesLabel,
    recipientPreviewLabel,
    effectiveRecipientCount,
    zeroRecipients,
    teamIds: input.teamIds.length > 1 ? input.teamIds : undefined,
  };

  return { canCommunicate, audience };
}
