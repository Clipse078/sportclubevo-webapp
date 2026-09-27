/**
 * SCE-COMM-03 / COMM-17 — communication preferences evaluation seam.
 */

import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import { evaluateCommunicationDeliveryPreferenceForUser } from "@/lib/communication/preferences/delivery-preference-resolver";

export type PreferenceEvaluationMode = "EVALUATED";

export async function evaluateCommunicationPreferenceForDeliveryUser(input: {
  tenantId: string;
  deliveryUserId: string;
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
  explicitMap?: Map<string, "ENABLED" | "DISABLED">;
}): Promise<{ allowed: boolean; mode: PreferenceEvaluationMode; reason: string }> {
  const result = await evaluateCommunicationDeliveryPreferenceForUser({
    tenantId: input.tenantId,
    userId: input.deliveryUserId,
    category: input.category,
    channel: input.channel,
    explicitMap: input.explicitMap,
  });
  return {
    allowed: result.allowed,
    mode: "EVALUATED",
    reason: result.reason,
  };
}
