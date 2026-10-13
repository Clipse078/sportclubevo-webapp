import type {
  SceActivityClubGovernancePolicy,
  SceActivityTypeGovernancePolicy,
} from "./types";

export type SceActivityGovernanceConfigurationIssue = {
  code: "APPROVAL_REQUIRED_WITHOUT_VALIDATORS";
  activityType: SceActivityTypeGovernancePolicy["activityType"];
  personId: string;
  message: string;
};

/**
 * Rejects effective configurations where a creator requires approval but no
 * validators exist for that activity type.
 */
export function validateActivityGovernanceConfiguration(
  policy: SceActivityClubGovernancePolicy,
): SceActivityGovernanceConfigurationIssue[] {
  const issues: SceActivityGovernanceConfigurationIssue[] = [];

  for (const typePolicy of policy.activityTypes) {
    const validatorCount = typePolicy.validatorPersonIds.length;
    if (validatorCount > 0) {
      continue;
    }

    const approvalCreators = typePolicy.creatorPolicies.filter(
      (p) => p.publicationAuthority === "APPROVAL_REQUIRED",
    );
    for (const creator of approvalCreators) {
      issues.push({
        code: "APPROVAL_REQUIRED_WITHOUT_VALIDATORS",
        activityType: typePolicy.activityType,
        personId: creator.personId,
        message:
          "Publication mode APPROVAL_REQUIRED requires at least one validator for this activity type.",
      });
    }

    if (
      typePolicy.defaultPublicationAuthority === "APPROVAL_REQUIRED" &&
      typePolicy.creatorPolicies.length === 0
    ) {
      issues.push({
        code: "APPROVAL_REQUIRED_WITHOUT_VALIDATORS",
        activityType: typePolicy.activityType,
        personId: "*",
        message:
          "Default publication APPROVAL_REQUIRED requires at least one validator when no creator-specific DIRECT_PUBLISH overrides exist.",
      });
    }
  }

  return issues;
}

export function assertActivityGovernanceConfigurationValid(
  policy: SceActivityClubGovernancePolicy,
): void {
  const issues = validateActivityGovernanceConfiguration(policy);
  if (issues.length > 0) {
    throw new Error(
      `Invalid activity governance configuration: ${issues.map((i) => i.message).join("; ")}`,
    );
  }
}

/**
 * Lifecycle note: removing the last validator while pending approvals exist must
 * block removal or require admin remediation — no automatic reassignment in V1.
 */
export const SCE_ACTIVITY_GOVERNANCE_VALIDATOR_REMOVAL_LIFECYCLE =
  "Removing the final eligible validator while APPROVAL_REQUIRED creators or PENDING_APPROVAL submissions exist requires explicit admin handling; auto-reassignment is out of scope for 01B-R3.";
