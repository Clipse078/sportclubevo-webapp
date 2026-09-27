/**
 * SCE-COMM-16 — routes scheduled execution through canonical publish services (COMM-11/12).
 */

import { publishCampaign } from "@/lib/communication/campaign/campaign-service";
import { publishClubCommunication } from "@/lib/communication/club/club-communication-service";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";
import type { PlatformCommunicationKind } from "@prisma/client";

const CLUB_KINDS = new Set<PlatformCommunicationKind>(["MESSAGE", "ANNOUNCEMENT", "ALERT"]);

export async function publishScheduledPlatformCommunication(input: {
  tenantId: string;
  communicationId: string;
  kind: PlatformCommunicationKind;
  senderUserId: string;
}): Promise<{ recipientCount: number; alreadyPublished: boolean }> {
  if (input.kind === "CAMPAIGN") {
    const result = await publishCampaign({
      tenantId: input.tenantId,
      campaignId: input.communicationId,
      senderUserId: input.senderUserId,
    });
    return { recipientCount: result.recipientCount, alreadyPublished: result.alreadyPublished };
  }

  if (CLUB_KINDS.has(input.kind)) {
    const result = await publishClubCommunication({
      tenantId: input.tenantId,
      communicationId: input.communicationId,
      senderUserId: input.senderUserId,
    });
    return { recipientCount: result.recipientCount, alreadyPublished: false };
  }

  throw new TeamCommunicationValidationError("communication kind cannot be scheduled for publication");
}
