import type { SceActivityCreateKind } from "@/lib/sce/activity-composer/types";

/** Publication authority after successful commit validation — not a third user-facing default. */
export type SceActivityPublicationAuthority = "DIRECT_PUBLISH" | "APPROVAL_REQUIRED";

/** Governance lifecycle — separate from domain sporting/match status fields. */
export type SceActivityGovernanceState =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "PUBLISHED";

/** V1 approver decisions — REQUEST_CHANGES is not REJECT. */
export type SceActivityApprovalDecision = "APPROVE" | "REQUEST_CHANGES" | "REJECT";

/**
 * Future threshold strategies (N-of-M, sequential chains) plug in here without
 * replacing revision-bound submissions or validator pools.
 */
export type SceActivityApprovalStrategyKind = "ANY_ONE" | "THRESHOLD_FUTURE";

export type SceActivityGovernancePersonRef = {
  personId: string;
  displayName?: string;
};

/** Creator-specific publication override within an activity type. */
export type SceActivityCreatorPublicationPolicy = {
  personId: string;
  createEnabled?: boolean;
  publicationAuthority: SceActivityPublicationAuthority;
};

/** Club defaults + validator pool + per-creator overrides for one activity type. */
export type SceActivityTypeGovernancePolicy = {
  activityType: SceActivityCreateKind;
  /** Default when creator has create permission but no explicit publication override. */
  defaultPublicationAuthority: SceActivityPublicationAuthority;
  /** Validators authorized to approve this activity type (1:n). Independent of create permission. */
  validatorPersonIds: readonly string[];
  /** Creator-specific publication authority overrides. */
  creatorPolicies: readonly SceActivityCreatorPublicationPolicy[];
};

/** Tenant-scoped governance configuration (single store — person-centric and governance-centric views). */
export type SceActivityClubGovernancePolicy = {
  tenantId: string;
  activityTypes: readonly SceActivityTypeGovernancePolicy[];
};

/** Effective decision consumed by Composer and future approval actions. */
export type SceActivityEffectiveGovernance = {
  activityType: SceActivityCreateKind;
  personId: string;
  mayCreate: boolean;
  publicationAuthority: SceActivityPublicationAuthority;
  approvalStrategy: SceActivityApprovalStrategyKind;
  validatorPersonIds: readonly string[];
};

export const SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY: SceActivityPublicationAuthority =
  "DIRECT_PUBLISH";

export const SCE_ACTIVITY_DEFAULT_APPROVAL_STRATEGY: SceActivityApprovalStrategyKind = "ANY_ONE";
