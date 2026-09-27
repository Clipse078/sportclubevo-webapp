import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";

export type CommunicationPreferenceEffectiveState =
  | "DEFAULT"
  | "ENABLED"
  | "DISABLED"
  | "REQUIRED";

export type CommunicationDeliveryPreferenceReason =
  | "DEFAULT_ALLOWED"
  | "EXPLICITLY_ENABLED"
  | "EXPLICITLY_DISABLED"
  | "REQUIRED_OPERATIONAL"
  | "CONSENT_REQUIRED"
  | "NO_DELIVERY_IDENTITY"
  | "CHANNEL_NOT_APPLICABLE";

export type CommunicationDeliveryPreferenceResult = {
  allowed: boolean;
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
  effectiveState: CommunicationPreferenceEffectiveState;
  reason: CommunicationDeliveryPreferenceReason;
};

export const ADMIN_PREFERENCE_SKIP_LABELS_DE: Record<string, string> = {
  EXPLICITLY_DISABLED: "E-Mail deaktiviert",
  CONSENT_REQUIRED: "Keine Einwilligung / Zustimmung erforderlich",
  CHANNEL_NOT_APPLICABLE: "Kanal nicht verfügbar",
  NO_DELIVERY_IDENTITY: "Kein Zustellkonto",
  PUSH_EXPLICITLY_DISABLED: "Push deaktiviert",
  PREFERENCE_EXPLICITLY_DISABLED: "Präferenz deaktiviert",
};
