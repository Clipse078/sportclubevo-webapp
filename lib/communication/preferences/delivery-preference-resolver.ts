import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import {
  evaluateCommunicationDeliveryPreference,
  type CommunicationPreferenceRecipientIdentity,
} from "@/lib/communication/preferences/evaluate-communication-delivery-preference";
import type { CommunicationDeliveryPreferenceResult } from "@/lib/communication/preferences/preference-reason-codes";
import {
  loadExplicitSponsorContactPreferenceMap,
  loadExplicitUserPreferenceMap,
} from "@/lib/communication/preferences/communication-preference-service";

export async function evaluateCommunicationDeliveryPreferenceForUser(input: {
  tenantId: string;
  userId: string;
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
  explicitMap?: Map<string, "ENABLED" | "DISABLED">;
}): Promise<CommunicationDeliveryPreferenceResult> {
  const explicit =
    input.explicitMap?.get(`${input.userId}:${input.category}:${input.channel}`) ?? null;
  return evaluateCommunicationDeliveryPreference({
    category: input.category,
    channel: input.channel,
    identity: { kind: "USER", tenantId: input.tenantId, userId: input.userId },
    explicitState: explicit,
  });
}

export async function evaluateCommunicationDeliveryPreferenceForSponsorContact(input: {
  tenantId: string;
  sponsorContactId: string;
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
  explicitMap?: Map<string, "ENABLED" | "DISABLED">;
}): Promise<CommunicationDeliveryPreferenceResult> {
  const explicit =
    input.explicitMap?.get(`${input.sponsorContactId}:${input.category}:${input.channel}`) ??
    null;
  return evaluateCommunicationDeliveryPreference({
    category: input.category,
    channel: input.channel,
    identity: {
      kind: "SPONSOR_CONTACT",
      tenantId: input.tenantId,
      sponsorContactId: input.sponsorContactId,
    },
    explicitState: explicit,
  });
}

export async function batchLoadPreferenceMapsForTenant(input: {
  tenantId: string;
  userIds: readonly string[];
  sponsorContactIds: readonly string[];
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
}) {
  const [userMap, sponsorMap] = await Promise.all([
    loadExplicitUserPreferenceMap({
      tenantId: input.tenantId,
      userIds: input.userIds,
      categories: [input.category],
      channels: [input.channel],
    }),
    loadExplicitSponsorContactPreferenceMap({
      tenantId: input.tenantId,
      sponsorContactIds: input.sponsorContactIds,
      category: input.category,
      channel: input.channel,
    }),
  ]);
  return { userMap, sponsorMap };
}

export type { CommunicationPreferenceRecipientIdentity };
