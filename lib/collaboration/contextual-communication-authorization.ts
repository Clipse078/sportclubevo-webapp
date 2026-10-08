/**
 * SCE-COLLAB-01A — activity edit ∩ communication send authorization.
 */

import { resolveTeamCommunicationAuthorization } from "@/lib/communication/team/team-communication-authorization";

export async function resolveContextualCommunicationSendAuthorization(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  teamId: string;
}): Promise<{ canCommunicate: boolean }> {
  const auth = await resolveTeamCommunicationAuthorization({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
    teamId: input.teamId,
  });
  return { canCommunicate: auth?.canSend === true };
}
