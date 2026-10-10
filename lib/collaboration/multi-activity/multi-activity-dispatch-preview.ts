/**
 * SCE-COLLAB-01D — deduplicated recipient union for grouped training impacts.
 */

import { eventCommunicationContext } from "@/lib/communication/platform/seams/event-communication-seam";
import { resolveCommunicationRecipients } from "@/lib/communication/platform/recipient-resolution/resolve-recipients";
import { unionSortedSets } from "@/lib/communication/platform/recipient-resolution/set-algebra";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

export type MultiActivityDispatchPreview = {
  recipientCount: number;
  canDispatch: boolean;
};

export async function resolveMultiActivityTrainingDispatchPreview(input: {
  tenantId: string;
  senderUserId: string;
  sessionIds: string[];
  audience: CommunicationAudienceSpec;
}): Promise<MultiActivityDispatchPreview> {
  if (input.sessionIds.length === 0) {
    return { recipientCount: 0, canDispatch: false };
  }

  try {
    const personIdSets: string[][] = [];
    for (const sessionId of input.sessionIds) {
      const resolution = await resolveCommunicationRecipients({
        tenantId: input.tenantId,
        senderActor: { userId: input.senderUserId },
        audience: input.audience,
        context: eventCommunicationContext(sessionId),
        channel: "IN_APP",
        category: "TEAM_OPERATIONAL",
        mode: "PREVIEW",
      });
      personIdSets.push(resolution.effectiveRecipientPersonIds);
    }

    const union = unionSortedSets(personIdSets);
    return { recipientCount: union.length, canDispatch: union.length > 0 };
  } catch {
    return { recipientCount: 0, canDispatch: false };
  }
}
