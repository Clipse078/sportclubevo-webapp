/**
 * SCE-COMM-01 — Authorization ≠ Zielgruppe (mandatory separation).
 *
 * SELECTED TARGET ∩ SENDER COMMUNICATION SCOPE ∩ RECIPIENT ELIGIBILITY
 *
 * Permission resolution reuses People/Access (lib/permissions/*). This module
 * defines pure intersection contracts enforceable at service/API boundaries.
 */

import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";

export type SenderCommunicationScope = {
  tenantId: string;
  senderUserId: string;
  /** Person ids the sender is allowed to address in the current context. */
  allowedSubjectPersonIds: ReadonlySet<string>;
};

export type RecipientEligibilityInput = {
  subjectPersonId: string;
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
  /** Resolved from UserNotificationPreference / future COMM-17 policy. */
  channelAllowedByPreference: boolean;
  /** Safeguarding / minor policy outcome (COMM-18). */
  safeguardingAllowsChannel: boolean;
};

export function intersectAudienceWithSenderScope(
  audiencePersonIds: readonly string[],
  scope: SenderCommunicationScope,
): string[] {
  return audiencePersonIds.filter((personId) => scope.allowedSubjectPersonIds.has(personId));
}

export function filterRecipientEligibility(
  subjectPersonIds: readonly string[],
  evaluate: (personId: string) => RecipientEligibilityInput | null,
): { eligible: string[]; skipped: { personId: string; reason: string }[] } {
  const eligible: string[] = [];
  const skipped: { personId: string; reason: string }[] = [];

  for (const personId of subjectPersonIds) {
    const input = evaluate(personId);
    if (!input) {
      skipped.push({ personId, reason: "SUBJECT_NOT_FOUND" });
      continue;
    }
    if (!input.safeguardingAllowsChannel) {
      skipped.push({ personId, reason: "SAFEGUARDING_BLOCKED" });
      continue;
    }
    if (!input.channelAllowedByPreference) {
      skipped.push({ personId, reason: "PREFERENCE_BLOCKED" });
      continue;
    }
    eligible.push(personId);
  }

  return { eligible, skipped };
}

/**
 * Selecting "whole organisation" MUST NOT expand sender rights — only intersect.
 */
export function resolveEffectiveRecipients(
  selectedAudiencePersonIds: readonly string[],
  senderScope: SenderCommunicationScope,
  eligibilityEvaluator: (personId: string) => RecipientEligibilityInput | null,
): {
  effectiveSubjectPersonIds: string[];
  skipped: { personId: string; reason: string }[];
} {
  const scoped = intersectAudienceWithSenderScope(selectedAudiencePersonIds, senderScope);
  const { eligible, skipped } = filterRecipientEligibility(scoped, eligibilityEvaluator);
  return { effectiveSubjectPersonIds: eligible, skipped };
}

/** Service-layer seam: implement with effective-permission-resolver + context rules. */
export type CommunicationAuthorizationPort = {
  resolveSenderScope(input: {
    tenantId: string;
    senderUserId: string;
    contextKind: string;
    contextReferenceId: string;
  }): Promise<SenderCommunicationScope>;
};
