/**
 * SCE-COMM-18 — machine-readable safeguarding decision codes.
 */

export const SAFEGUARDING_REASON_CODES = [
  "ADULT_NORMAL_DELIVERY",
  "SAFEGUARDING_DISABLED",
  "MINOR_GUARDIAN_ONLY_DELIVERY",
  "MINOR_DIRECT_AND_GUARDIAN_VISIBILITY",
  "MINOR_DIRECT_DELIVERY_FORBIDDEN",
  "GUARDIAN_REQUIRED_UNAVAILABLE",
  "MINOR_DIRECT_MESSAGING_BLOCKED",
] as const;

export type SafeguardingReasonCode = (typeof SAFEGUARDING_REASON_CODES)[number];

export function isSafeguardingReasonCode(value: string): value is SafeguardingReasonCode {
  return (SAFEGUARDING_REASON_CODES as readonly string[]).includes(value);
}
