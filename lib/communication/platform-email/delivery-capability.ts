/**
 * Immutable external snapshot delivery capability markers (COMM-13/14).
 */

export const EXTERNAL_EMAIL_DELIVERY_CANDIDATE = "EMAIL_DELIVERY_CANDIDATE" as const;
export const EXTERNAL_EMAIL_SKIPPED_NO_ADDRESS = "EMAIL_SKIPPED_NO_ADDRESS" as const;
export const EXTERNAL_EMAIL_SKIPPED_INVALID_ADDRESS = "EMAIL_SKIPPED_INVALID_ADDRESS" as const;
export const EXTERNAL_EMAIL_SKIPPED_CHANNEL_DISABLED = "EMAIL_SKIPPED_CHANNEL_DISABLED" as const;
export const EXTERNAL_EMAIL_SKIPPED_NOT_READY = "EMAIL_SKIPPED_NOT_READY" as const;
export const EXTERNAL_IN_APP_UNAVAILABLE = "IN_APP_UNAVAILABLE" as const;

export type ExternalSnapshotDeliveryCapability =
  | typeof EXTERNAL_EMAIL_DELIVERY_CANDIDATE
  | typeof EXTERNAL_EMAIL_SKIPPED_NO_ADDRESS
  | typeof EXTERNAL_EMAIL_SKIPPED_INVALID_ADDRESS
  | typeof EXTERNAL_EMAIL_SKIPPED_CHANNEL_DISABLED
  | typeof EXTERNAL_EMAIL_SKIPPED_NOT_READY
  | typeof EXTERNAL_IN_APP_UNAVAILABLE;

export function resolveExternalEmailDeliveryCapability(input: {
  emailChannelEnabled: boolean;
  transportReady: boolean;
  email: string | null | undefined;
}): ExternalSnapshotDeliveryCapability {
  if (!input.emailChannelEnabled) {
    return EXTERNAL_EMAIL_SKIPPED_CHANNEL_DISABLED;
  }
  if (!input.transportReady) {
    return EXTERNAL_EMAIL_SKIPPED_NOT_READY;
  }
  const trimmed = input.email?.trim() ?? "";
  if (!trimmed) {
    return EXTERNAL_EMAIL_SKIPPED_NO_ADDRESS;
  }
  const normalized = trimmed.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return EXTERNAL_EMAIL_SKIPPED_INVALID_ADDRESS;
  }
  return EXTERNAL_EMAIL_DELIVERY_CANDIDATE;
}
