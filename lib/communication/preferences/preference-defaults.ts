import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import { DEFAULT_CATEGORY_CHANNEL_ELIGIBILITY } from "@/lib/communication/platform/preference-categories";
import type { CommunicationPreferenceEffectiveState } from "@/lib/communication/preferences/preference-reason-codes";

export type StoredExplicitPreferenceState = "ENABLED" | "DISABLED" | null;

export function isOperationalPreferenceCategory(
  category: CommunicationPreferenceCategory,
): boolean {
  return category === "TEAM_OPERATIONAL" || category === "CLUB_OPERATIONAL";
}

export function isChannelApplicableToCategory(
  category: CommunicationPreferenceCategory,
  channel: CommunicationChannel,
): boolean {
  return DEFAULT_CATEGORY_CHANNEL_ELIGIBILITY[category].includes(channel);
}

/**
 * Product defaults when no explicit UserCommunicationPreference row exists.
 * OPERATIONAL categories are required (non-disableable). SPONSOR_COMMERCIAL
 * email requires explicit opt-in (conservative — not legal advice).
 */
export function resolveDefaultEffectiveState(input: {
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
}): CommunicationPreferenceEffectiveState {
  if (!isChannelApplicableToCategory(input.category, input.channel)) {
    return "DISABLED";
  }
  if (isOperationalPreferenceCategory(input.category)) {
    return "REQUIRED";
  }
  if (input.category === "SPONSOR_COMMERCIAL" && input.channel === "EMAIL") {
    return "DISABLED";
  }
  return "DEFAULT";
}

export function isUserConfigurablePreference(input: {
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
}): boolean {
  if (!isChannelApplicableToCategory(input.category, input.channel)) {
    return false;
  }
  return !isOperationalPreferenceCategory(input.category);
}

export function mergeExplicitWithDefault(input: {
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
  explicit: StoredExplicitPreferenceState;
}): CommunicationPreferenceEffectiveState {
  if (isOperationalPreferenceCategory(input.category)) {
    return "REQUIRED";
  }
  if (input.explicit === "ENABLED") return "ENABLED";
  if (input.explicit === "DISABLED") return "DISABLED";
  return resolveDefaultEffectiveState(input);
}
