/**
 * SCE-COMM-01 — youth / guardian safeguarding policy seam (tenant-configurable).
 *
 * Guardian relationships: lib/people/guardian-service.ts + GuardianRelationship model.
 * Notification guardian expansion precedent: lib/notifications/requirement-recipient-resolution.ts
 */

export type MinorDirectMessagingPolicy =
  | "BLOCK_TRAINER_TO_MINOR_DIRECT"
  | "ALLOW_WITH_AUDIT"
  | "TENANT_CONFIGURED";

export type GuardianRecipientPolicy =
  | "SUBJECT_ONLY"
  | "PRIMARY_GUARDIAN"
  | "ALL_GUARDIANS"
  | "GUARDIAN_SUBSTITUTION";

export type TenantSafeguardingCommunicationPolicy = {
  tenantId: string;
  minorDirectMessaging: MinorDirectMessagingPolicy;
  guardianRecipient: GuardianRecipientPolicy;
  /** When true, trainer→team messages to minors expand to guardians per policy. */
  expandTeamOperationalToGuardians: boolean;
};

export type SafeguardingEvaluationInput = {
  policy: TenantSafeguardingCommunicationPolicy;
  senderUserId: string;
  subjectPersonId: string;
  subjectIsMinor: boolean;
  channel: "IN_APP" | "PUSH" | "EMAIL";
};

export type SafeguardingEvaluationResult =
  | { allowed: true; expandToGuardianPersonIds: string[] }
  | { allowed: false; reason: "MINOR_DIRECT_MESSAGING_BLOCKED" | "CHANNEL_BLOCKED" };

/**
 * Pure policy evaluation stub — persistence and age lookup in COMM-18.
 */
export function evaluateSafeguardingCommunication(
  input: SafeguardingEvaluationInput,
): SafeguardingEvaluationResult {
  if (
    input.subjectIsMinor &&
    input.policy.minorDirectMessaging === "BLOCK_TRAINER_TO_MINOR_DIRECT"
  ) {
    if (input.policy.guardianRecipient === "SUBJECT_ONLY") {
      return { allowed: false, reason: "MINOR_DIRECT_MESSAGING_BLOCKED" };
    }
    return { allowed: true, expandToGuardianPersonIds: [] };
  }
  return { allowed: true, expandToGuardianPersonIds: [] };
}
