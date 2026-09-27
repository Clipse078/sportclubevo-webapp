/**
 * SCE-COMM-01 — recipient engagement states (distinct from delivery).
 */

export const RECIPIENT_ENGAGEMENT_STATES = [
  "PENDING",
  "DELIVERED",
  "READ",
  "ACKNOWLEDGED",
  "RESPONDED",
] as const;

export type RecipientEngagementState = (typeof RECIPIENT_ENGAGEMENT_STATES)[number];

export function isRecipientEngagementState(value: string): value is RecipientEngagementState {
  return (RECIPIENT_ENGAGEMENT_STATES as readonly string[]).includes(value);
}

/** Legal transitions for engagement tracking (per recipient, per communication). */
export const RECIPIENT_ENGAGEMENT_TRANSITIONS: Record<
  RecipientEngagementState,
  readonly RecipientEngagementState[]
> = {
  PENDING: ["DELIVERED", "READ", "ACKNOWLEDGED", "RESPONDED"],
  DELIVERED: ["READ", "ACKNOWLEDGED", "RESPONDED"],
  READ: ["ACKNOWLEDGED", "RESPONDED"],
  ACKNOWLEDGED: ["RESPONDED"],
  RESPONDED: [],
};

export function canTransitionRecipientEngagement(
  from: RecipientEngagementState,
  to: RecipientEngagementState,
): boolean {
  if (from === to) return true;
  return RECIPIENT_ENGAGEMENT_TRANSITIONS[from].includes(to);
}
