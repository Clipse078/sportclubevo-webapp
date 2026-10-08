/**
 * SCE-COLLAB-01A — assemble training change impact after successful mutations.
 */

import { defaultTeamOperationalAudience } from "@/lib/communication/platform/seams/team-communication-seam";
import { eventCommunicationContext } from "@/lib/communication/platform/seams/event-communication-seam";
import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { buildTrainingActivityChangeImpact } from "@/lib/collaboration/training/training-activity-change";
import type { TrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import { resolveContextualCommunicationSendAuthorization } from "@/lib/collaboration/contextual-communication-authorization";

export async function resolveTrainingCollaborationImpactAfterChange(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  before: TrainingActivitySnapshot;
  after: TrainingActivitySnapshot;
}): Promise<ActivityChangeImpact | null> {
  const { canCommunicate } = await resolveContextualCommunicationSendAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
    teamId: input.after.teamId,
  });

  let effectiveRecipientCount: number | null = null;
  let zeroRecipients = false;
  let recipientPreviewLabel: string | null = null;

  if (canCommunicate) {
    try {
      const audience = defaultTeamOperationalAudience(input.after.teamId);
      const contextRef = eventCommunicationContext(input.after.sessionId);
      const resolution = await resolveCommunicationRecipients({
        tenantId: input.tenantId,
        senderActor: { userId: input.userId },
        audience,
        context: contextRef,
        channel: "IN_APP",
        category: "TEAM_OPERATIONAL",
        mode: "PREVIEW",
      });
      effectiveRecipientCount = resolution.summary.effectiveCount;
      zeroRecipients = effectiveRecipientCount === 0;
      recipientPreviewLabel =
        effectiveRecipientCount > 0
          ? `${input.after.teamName} · ${effectiveRecipientCount} Empfänger`
          : input.after.teamName;
    } catch {
      effectiveRecipientCount = null;
      zeroRecipients = false;
      recipientPreviewLabel = input.after.teamName;
    }
  }

  const impact = buildTrainingActivityChangeImpact({
    before: input.before,
    after: input.after,
    canCommunicate,
    audience: {
      teamId: input.after.teamId,
      teamName: input.after.teamName,
      recipientPreviewLabel,
      effectiveRecipientCount,
      zeroRecipients,
    },
  });

  return impact.worthy ? impact : null;
}
