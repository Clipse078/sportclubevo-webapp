/**
 * SCE-COMM-01 / COMM-18 — youth / guardian safeguarding policy seam.
 *
 * Legacy COMM-01 types remain; evaluation delegates to evaluateCommunicationSafeguarding.
 */

import {
  evaluateCommunicationSafeguarding,
  type CommunicationSafeguardingEvaluation,
} from "@/lib/communication/platform/safeguarding/evaluate-communication-safeguarding";
import {
  defaultTenantCommunicationSafeguardingPolicy,
  type TenantCommunicationSafeguardingPolicyConfig,
} from "@/lib/communication/platform/safeguarding/tenant-safeguarding-policy";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";

export type MinorDirectMessagingPolicy =
  | "BLOCK_TRAINER_TO_MINOR_DIRECT"
  | "ALLOW_WITH_AUDIT"
  | "TENANT_CONFIGURED";

export type GuardianRecipientPolicy =
  | "SUBJECT_ONLY"
  | "PRIMARY_GUARDIAN"
  | "ALL_GUARDIANS"
  | "GUARDIAN_SUBSTITUTION";

/** @deprecated Use TenantCommunicationSafeguardingPolicyConfig — kept for COMM-03 imports. */
export type TenantSafeguardingCommunicationPolicy = {
  tenantId: string;
  minorDirectMessaging: MinorDirectMessagingPolicy;
  guardianRecipient: GuardianRecipientPolicy;
  expandTeamOperationalToGuardians: boolean;
  config?: TenantCommunicationSafeguardingPolicyConfig;
};

export type SafeguardingEvaluationInput = {
  policy: TenantSafeguardingCommunicationPolicy;
  senderUserId: string;
  subjectPersonId: string;
  subjectIsMinor: boolean;
  channel: CommunicationChannel;
  subjectDateOfBirth?: Date | null;
  selfUserId?: string | null;
  guardianRecipients?: import("@/lib/communication/platform/safeguarding/guardian-recipient-types").SafeguardingGuardianRecipient[];
};

export type SafeguardingEvaluationResult =
  | { allowed: true; expandToGuardianPersonIds: string[]; evaluation: CommunicationSafeguardingEvaluation }
  | { allowed: false; reason: "MINOR_DIRECT_MESSAGING_BLOCKED" | "CHANNEL_BLOCKED" | "GUARDIAN_REQUIRED_UNAVAILABLE" };

function legacyPolicyToConfig(
  policy: TenantSafeguardingCommunicationPolicy,
): TenantCommunicationSafeguardingPolicyConfig {
  if (policy.config) return policy.config;
  const base = defaultTenantCommunicationSafeguardingPolicy(policy.tenantId);
  if (policy.guardianRecipient === "PRIMARY_GUARDIAN") {
    return { ...base, deliverToAllActiveGuardians: false };
  }
  if (policy.guardianRecipient === "SUBJECT_ONLY") {
    return {
      ...base,
      guardianOnlyDeliveryRequired: false,
      allowDirectMinorDelivery: true,
      guardianVisibilityRequired: false,
    };
  }
  return base;
}

export function evaluateSafeguardingCommunication(
  input: SafeguardingEvaluationInput,
): SafeguardingEvaluationResult {
  void input.channel;
  void input.senderUserId;

  const config = legacyPolicyToConfig(input.policy);
  const evaluation = evaluateCommunicationSafeguarding({
    policy: config,
    subject: {
      subjectPersonId: input.subjectPersonId,
      dateOfBirth: input.subjectDateOfBirth ?? null,
      subjectIsMinorOverride: input.subjectDateOfBirth ? undefined : input.subjectIsMinor,
      selfUserId: input.selfUserId ?? null,
      guardianRecipients: input.guardianRecipients ?? [],
    },
  });

  if (!evaluation.deliveryPermitted) {
    const reason =
      evaluation.reason === "GUARDIAN_REQUIRED_UNAVAILABLE"
        ? "GUARDIAN_REQUIRED_UNAVAILABLE"
        : "MINOR_DIRECT_MESSAGING_BLOCKED";
    return { allowed: false, reason };
  }

  return {
    allowed: true,
    expandToGuardianPersonIds: evaluation.guardianRecipients.map((g) => g.guardianPersonId),
    evaluation,
  };
}

export {
  evaluateCommunicationSafeguarding,
  type CommunicationSafeguardingEvaluation,
  type TenantCommunicationSafeguardingPolicyConfig,
  defaultTenantCommunicationSafeguardingPolicy,
};
