import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import {
  isChannelApplicableToCategory,
  mergeExplicitWithDefault,
  resolveDefaultEffectiveState,
  type StoredExplicitPreferenceState,
} from "@/lib/communication/preferences/preference-defaults";
import type {
  CommunicationDeliveryPreferenceReason,
  CommunicationDeliveryPreferenceResult,
} from "@/lib/communication/preferences/preference-reason-codes";

export type CommunicationPreferenceRecipientIdentity =
  | { kind: "USER"; tenantId: string; userId: string }
  | { kind: "SPONSOR_CONTACT"; tenantId: string; sponsorContactId: string }
  | { kind: "NONE"; tenantId: string };

function reasonForEffectiveState(input: {
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
  effectiveState: ReturnType<typeof mergeExplicitWithDefault>;
  explicit: StoredExplicitPreferenceState;
}): CommunicationDeliveryPreferenceReason {
  if (!isChannelApplicableToCategory(input.category, input.channel)) {
    return "CHANNEL_NOT_APPLICABLE";
  }
  if (input.effectiveState === "REQUIRED") {
    return "REQUIRED_OPERATIONAL";
  }
  if (input.explicit === "ENABLED") {
    return "EXPLICITLY_ENABLED";
  }
  if (input.explicit === "DISABLED") {
    return "EXPLICITLY_DISABLED";
  }
  if (
    input.category === "SPONSOR_COMMERCIAL" &&
    input.channel === "EMAIL" &&
    input.effectiveState === "DISABLED"
  ) {
    return "CONSENT_REQUIRED";
  }
  return "DEFAULT_ALLOWED";
}

export function evaluateCommunicationDeliveryPreference(input: {
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
  identity: CommunicationPreferenceRecipientIdentity;
  explicitState?: StoredExplicitPreferenceState;
}): CommunicationDeliveryPreferenceResult {
  if (input.identity.kind === "NONE") {
    return {
      allowed: false,
      category: input.category,
      channel: input.channel,
      effectiveState: "DISABLED",
      reason: "NO_DELIVERY_IDENTITY",
    };
  }

  if (input.identity.tenantId.trim().length === 0) {
    return {
      allowed: false,
      category: input.category,
      channel: input.channel,
      effectiveState: "DISABLED",
      reason: "NO_DELIVERY_IDENTITY",
    };
  }

  const explicit = input.explicitState ?? null;
  const effectiveState = mergeExplicitWithDefault({
    category: input.category,
    channel: input.channel,
    explicit,
  });

  const reason = reasonForEffectiveState({
    category: input.category,
    channel: input.channel,
    effectiveState,
    explicit,
  });

  let allowed = false;
  if (effectiveState === "REQUIRED" || effectiveState === "ENABLED") {
    allowed = isChannelApplicableToCategory(input.category, input.channel);
  } else if (effectiveState === "DEFAULT") {
    allowed = resolveDefaultEffectiveState({
      category: input.category,
      channel: input.channel,
    }) !== "DISABLED";
    if (
      input.category === "SPONSOR_COMMERCIAL" &&
      input.channel === "EMAIL" &&
      explicit === null
    ) {
      allowed = false;
    }
  }

  if (reason === "CHANNEL_NOT_APPLICABLE") {
    allowed = false;
  }

  return {
    allowed,
    category: input.category,
    channel: input.channel,
    effectiveState,
    reason,
  };
}
