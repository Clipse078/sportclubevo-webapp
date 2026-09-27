/**
 * SCE-COMM-03 — stable exclusion / eligibility reason codes.
 */

export const RECIPIENT_EXCLUSION_REASON_CODES = [
  "OUTSIDE_SENDER_SCOPE",
  "CROSS_TENANT",
  "INACTIVE",
  "EXPLICITLY_EXCLUDED",
  "SAFEGUARDING_POLICY",
  "PREFERENCE_BLOCKED",
  "CHANNEL_UNAVAILABLE",
  "NOT_FOUND",
  "COMPOSITION_CYCLE",
  "COMPOSITION_DEPTH_EXCEEDED",
] as const;

export type RecipientExclusionReasonCode = (typeof RECIPIENT_EXCLUSION_REASON_CODES)[number];

export function isRecipientExclusionReasonCode(
  value: string,
): value is RecipientExclusionReasonCode {
  return (RECIPIENT_EXCLUSION_REASON_CODES as readonly string[]).includes(value);
}
