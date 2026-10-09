/**
 * SCE-COLLAB-01B-R5 — authoritative recipient preview at contextual prepare time.
 */

import { eventCommunicationContext } from "@/lib/communication/platform/seams/event-communication-seam";
import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

export type ActivityChangeDispatchPreview = {
  recipientCount: number;
  canDispatch: boolean;
};

export async function resolveActivityChangeDispatchPreview(input: {
  tenantId: string;
  senderUserId: string;
  eventId: string;
  audience: CommunicationAudienceSpec;
}): Promise<ActivityChangeDispatchPreview> {
  try {
    const resolution = await resolveCommunicationRecipients({
      tenantId: input.tenantId,
      senderActor: { userId: input.senderUserId },
      audience: input.audience,
      context: eventCommunicationContext(input.eventId),
      channel: "IN_APP",
      category: "TEAM_OPERATIONAL",
      mode: "PREVIEW",
    });
    const recipientCount = resolution.summary.effectiveCount;
    return { recipientCount, canDispatch: recipientCount > 0 };
  } catch {
    return { recipientCount: 0, canDispatch: false };
  }
}
