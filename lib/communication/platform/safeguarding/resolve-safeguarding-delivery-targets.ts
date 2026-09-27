/**
 * SCE-COMM-18 — map safeguarding evaluation to deduplicated delivery identities.
 */

import type { CommunicationSafeguardingEvaluation } from "@/lib/communication/platform/safeguarding/evaluate-communication-safeguarding";

export type SafeguardingDeliveryTarget = {
  subjectPersonId: string;
  deliveryUserId: string;
  viaGuardianSubstitution: boolean;
  guardianPersonId: string | null;
  safeguardingReasonCode: string;
  subjectMinorAtDispatch: boolean;
};

export function resolveSafeguardingDeliveryTargets(input: {
  evaluation: CommunicationSafeguardingEvaluation;
  selfUserId: string | null;
}): SafeguardingDeliveryTarget[] {
  const { evaluation } = input;
  if (!evaluation.deliveryPermitted) {
    return [];
  }

  const targets: SafeguardingDeliveryTarget[] = [];
  const seenDeliveryUsers = new Set<string>();

  const pushTarget = (deliveryUserId: string, viaGuardian: boolean, guardianPersonId: string | null) => {
    if (!deliveryUserId.trim() || seenDeliveryUsers.has(deliveryUserId)) return;
    seenDeliveryUsers.add(deliveryUserId);
    targets.push({
      subjectPersonId: evaluation.subjectPersonId,
      deliveryUserId,
      viaGuardianSubstitution: viaGuardian,
      guardianPersonId,
      safeguardingReasonCode: evaluation.reason,
      subjectMinorAtDispatch: evaluation.isMinorUnderTenantPolicy,
    });
  };

  if (evaluation.directDeliveryAllowed && input.selfUserId?.trim()) {
    pushTarget(input.selfUserId, false, null);
  }

  for (const guardian of evaluation.guardianRecipients) {
    const userId = guardian.guardianUserId?.trim();
    if (!userId) continue;
    const needsGuardianCopy =
      evaluation.guardianDeliveryRequired ||
      evaluation.guardianVisibilityRequired ||
      !evaluation.directDeliveryAllowed;
    if (needsGuardianCopy) {
      pushTarget(userId, true, guardian.guardianPersonId);
    }
  }

  return targets;
}
