/**
 * SCE-COMM-18 — canonical youth/guardian safeguarding evaluator (pure).
 *
 * Guardian delivery does not change the communication subject.
 */

import type { TenantCommunicationSafeguardingPolicyConfig } from "@/lib/communication/platform/safeguarding/tenant-safeguarding-policy";
import { isPersonMinorUnderTenantPolicy } from "@/lib/communication/platform/safeguarding/subject-age-policy";
import type { SafeguardingGuardianRecipient } from "@/lib/communication/platform/safeguarding/guardian-recipient-types";
import type { SafeguardingReasonCode } from "@/lib/communication/platform/safeguarding/safeguarding-reason-codes";

export type CommunicationSafeguardingContext = {
  /** When true, trainer→minor direct paths (e.g. chat mention) are evaluated. */
  trainerDirectInteraction?: boolean;
  referenceDate?: Date;
};

export type CommunicationSafeguardingEvaluation = {
  subjectPersonId: string;
  isMinorUnderTenantPolicy: boolean;
  directDeliveryAllowed: boolean;
  guardianDeliveryRequired: boolean;
  guardianVisibilityRequired: boolean;
  guardianResponseAllowed: boolean;
  guardianRecipients: SafeguardingGuardianRecipient[];
  reason: SafeguardingReasonCode;
  /** False when delivery must not proceed (fail closed). */
  deliveryPermitted: boolean;
};

function eligibleGuardianDeliveryRecipients(
  guardians: SafeguardingGuardianRecipient[],
  policy: TenantCommunicationSafeguardingPolicyConfig,
): SafeguardingGuardianRecipient[] {
  const withUser = guardians.filter((g) => Boolean(g.guardianUserId?.trim()));
  if (withUser.length === 0) return [];
  if (policy.deliverToAllActiveGuardians) {
    return withUser;
  }
  const primary = withUser.find((g) => g.isPrimary);
  return primary ? [primary] : [withUser[0]!];
}

/**
 * Evaluates safeguarding policy for one subject person.
 */
export function evaluateCommunicationSafeguarding(input: {
  policy: TenantCommunicationSafeguardingPolicyConfig;
  subject: {
    subjectPersonId: string;
    dateOfBirth: Date | null;
    selfUserId: string | null;
    guardianRecipients: SafeguardingGuardianRecipient[];
    /** Legacy seam when DOB is unavailable at call site. */
    subjectIsMinorOverride?: boolean;
  };
  context?: CommunicationSafeguardingContext;
}): CommunicationSafeguardingEvaluation {
  const referenceDate = input.context?.referenceDate ?? new Date();
  const { policy, subject } = input;

  const isMinor = policy.safeguardingEnabled
    ? subject.subjectIsMinorOverride ??
      isPersonMinorUnderTenantPolicy({
        dateOfBirth: subject.dateOfBirth,
        minorAgeThresholdYears: policy.minorAgeThresholdYears,
        referenceDate,
      })
    : false;

  if (!policy.safeguardingEnabled || !isMinor) {
    return {
      subjectPersonId: subject.subjectPersonId,
      isMinorUnderTenantPolicy: isMinor,
      directDeliveryAllowed: true,
      guardianDeliveryRequired: false,
      guardianVisibilityRequired: false,
      guardianResponseAllowed: true,
      guardianRecipients: subject.guardianRecipients,
      reason: policy.safeguardingEnabled ? "ADULT_NORMAL_DELIVERY" : "SAFEGUARDING_DISABLED",
      deliveryPermitted: true,
    };
  }

  const guardianRecipients = eligibleGuardianDeliveryRecipients(
    subject.guardianRecipients,
    policy,
  );
  const guardianResponseAllowed = policy.guardianResponseAuthorityEnabled;

  if (
    input.context?.trainerDirectInteraction === true &&
    !policy.allowDirectMinorDelivery
  ) {
    return {
      subjectPersonId: subject.subjectPersonId,
      isMinorUnderTenantPolicy: true,
      directDeliveryAllowed: false,
      guardianDeliveryRequired: true,
      guardianVisibilityRequired: policy.guardianVisibilityRequired,
      guardianResponseAllowed,
      guardianRecipients,
      reason: "MINOR_DIRECT_MESSAGING_BLOCKED",
      deliveryPermitted: guardianRecipients.length > 0,
    };
  }

  if (policy.guardianOnlyDeliveryRequired || !policy.allowDirectMinorDelivery) {
    const permitted = guardianRecipients.length > 0;
    return {
      subjectPersonId: subject.subjectPersonId,
      isMinorUnderTenantPolicy: true,
      directDeliveryAllowed: false,
      guardianDeliveryRequired: true,
      guardianVisibilityRequired: policy.guardianVisibilityRequired,
      guardianResponseAllowed,
      guardianRecipients,
      reason: permitted
        ? "MINOR_GUARDIAN_ONLY_DELIVERY"
        : "GUARDIAN_REQUIRED_UNAVAILABLE",
      deliveryPermitted: permitted,
    };
  }

  if (policy.allowDirectMinorDelivery && policy.guardianVisibilityRequired) {
    const permitted =
      Boolean(subject.selfUserId?.trim()) || guardianRecipients.length > 0;
    return {
      subjectPersonId: subject.subjectPersonId,
      isMinorUnderTenantPolicy: true,
      directDeliveryAllowed: true,
      guardianDeliveryRequired: guardianRecipients.length > 0,
      guardianVisibilityRequired: true,
      guardianResponseAllowed,
      guardianRecipients,
      reason: permitted
        ? "MINOR_DIRECT_AND_GUARDIAN_VISIBILITY"
        : "GUARDIAN_REQUIRED_UNAVAILABLE",
      deliveryPermitted: permitted,
    };
  }

  return {
    subjectPersonId: subject.subjectPersonId,
    isMinorUnderTenantPolicy: true,
    directDeliveryAllowed: policy.allowDirectMinorDelivery,
    guardianDeliveryRequired: false,
    guardianVisibilityRequired: false,
    guardianResponseAllowed,
    guardianRecipients,
    reason: policy.allowDirectMinorDelivery
      ? "ADULT_NORMAL_DELIVERY"
      : "MINOR_DIRECT_DELIVERY_FORBIDDEN",
    deliveryPermitted: policy.allowDirectMinorDelivery && Boolean(subject.selfUserId),
  };
}
