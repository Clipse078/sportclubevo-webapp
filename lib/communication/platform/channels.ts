/**
 * SCE-COMM-01 — delivery channel abstraction (content ≠ delivery attempt).
 */

export const COMMUNICATION_CHANNELS = ["IN_APP", "PUSH", "EMAIL"] as const;

export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

/** Reserved for future packages; not implemented in COMM-01. */
export const COMMUNICATION_CHANNEL_SMS = "SMS" as const;

export type FutureCommunicationChannel = CommunicationChannel | typeof COMMUNICATION_CHANNEL_SMS;

export function isCommunicationChannel(value: string): value is CommunicationChannel {
  return (COMMUNICATION_CHANNELS as readonly string[]).includes(value);
}

export const COMMUNICATION_DELIVERY_STATUSES = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "FAILED",
  "SKIPPED",
] as const;

export type CommunicationDeliveryStatus = (typeof COMMUNICATION_DELIVERY_STATUSES)[number];

export function isCommunicationDeliveryStatus(
  value: string,
): value is CommunicationDeliveryStatus {
  return (COMMUNICATION_DELIVERY_STATUSES as readonly string[]).includes(value);
}

/**
 * Provider truth table — do not claim DELIVERED when the channel cannot support proof.
 */
export const CHANNEL_SUPPORTS_DELIVERED_CONFIRMATION: Record<CommunicationChannel, boolean> = {
  IN_APP: true,
  PUSH: false,
  EMAIL: false,
};
