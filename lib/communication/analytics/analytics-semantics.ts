/**
 * SCE-COMM-19 — counting and channel semantics (facts only).
 *
 * Delivery analytics report evidence, not assumptions.
 */

export const ANALYTICS_TRUTH_STATEMENT =
  "Delivery analytics report evidence, not assumptions." as const;

/** Target subjects: people/entities the communication concerns (historical snapshots). */
export type AnalyticsAudienceCounts = {
  targetSubjectCount: number;
  recipientSnapshotCount: number;
  deliveryIdentityCount: number;
};

export type ChannelOutcomeCounts = {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  skipped: number;
};

export type InAppEngagementCounts = {
  /** Snapshots available in-app (internal deliverable). */
  available: number;
  unread: number;
  read: number;
  acknowledged: number;
  responded: number;
};

export type EmailSkipReasonBuckets = {
  preferenceDisabled: number;
  consentRequired: number;
  channelUnavailable: number;
  missingOrInvalidEmail: number;
  other: number;
};

export type PushAnalyticsCounts = {
  /** Distinct delivery identities with push notification deliveries. */
  recipientIdentities: number;
  /** Per-device push attempts (may exceed recipient identities). */
  deviceAttempts: number;
  outcomes: ChannelOutcomeCounts;
};

export function bucketEmailSkipFailureCode(failureCode: string | null): keyof EmailSkipReasonBuckets {
  const code = (failureCode ?? "").toUpperCase();
  if (
    code.includes("PREFERENCE") &&
    (code.includes("DISABLED") || code === "EXPLICITLY_DISABLED")
  ) {
    return "preferenceDisabled";
  }
  if (code === "CONSENT_REQUIRED") {
    return "consentRequired";
  }
  if (
    code.includes("CHANNEL") ||
    code === "EMAIL_CHANNEL_DISABLED" ||
    code === "INTERNAL_NO_CHANNEL" ||
    code === "EMAIL_NOT_READY"
  ) {
    return "channelUnavailable";
  }
  if (code.includes("MISSING_EMAIL") || code.includes("INVALID_EMAIL") || code.includes("NO_ADDRESS")) {
    return "missingOrInvalidEmail";
  }
  return "other";
}

/** Higher priority wins for canonical per-recipient push headline status. */
const PUSH_STATUS_PRIORITY: Record<string, number> = {
  SENT: 50,
  SKIPPED: 40,
  FAILED: 30,
  PROCESSING: 20,
  PENDING: 10,
};

export function mergePushRecipientStatus(
  current: string | null,
  next: string,
): string {
  if (!current) return next;
  const curP = PUSH_STATUS_PRIORITY[current] ?? 0;
  const nextP = PUSH_STATUS_PRIORITY[next] ?? 0;
  return nextP >= curP ? next : current;
}
