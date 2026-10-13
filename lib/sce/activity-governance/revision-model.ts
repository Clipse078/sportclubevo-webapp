/** Material governance fields — one extensible classifier for all activity types. */
export type SceActivityMaterialChangeCategory =
  | "SCHEDULE"
  | "TEAM"
  | "VENUE_OR_RESOURCES"
  | "RECURRENCE"
  | "PARTICIPANTS_OR_OPPONENT"
  | "ORGANISATIONAL_AUDIENCE"
  | "PUBLICATION_SCOPE";

export type SceActivityGovernanceRevisionRef = {
  activityId: string;
  revisionId: string;
  revisionNumber: number;
  creatorPersonId: string;
  submittedAt: string | null;
};

export type SceActivityApprovalRecord = {
  revisionId: string;
  decision: "APPROVE" | "REQUEST_CHANGES" | "REJECT";
  approverPersonId: string;
  decidedAt: string;
  comment?: string;
};

/**
 * Approval applies to a specific submitted revision. Material changes after approval
 * invalidate prior approval and require resubmission.
 */
export type SceActivityGovernanceSubmission = {
  activityId: string;
  activityType: string;
  revision: SceActivityGovernanceRevisionRef;
  governanceState: import("./types").SceActivityGovernanceState;
  effectivePolicySnapshot: {
    publicationAuthority: import("./types").SceActivityPublicationAuthority;
    validatorPersonIds: readonly string[];
  };
  approvalHistory: readonly SceActivityApprovalRecord[];
};

export type SceActivityMaterialChangeInput = {
  categories: readonly SceActivityMaterialChangeCategory[];
};

export function approvalAppliesToRevision(input: {
  approvalRevisionId: string;
  currentRevisionId: string;
}): boolean {
  return input.approvalRevisionId === input.currentRevisionId;
}

export function materialChangeInvalidatesApproval(input: {
  previousRevisionId: string;
  currentRevisionId: string;
  materialCategories: readonly SceActivityMaterialChangeCategory[];
}): boolean {
  if (input.previousRevisionId === input.currentRevisionId) {
    return false;
  }
  return input.materialCategories.length > 0;
}

/** Internal notes and non-material metadata do not invalidate approval by default. */
export const SCE_ACTIVITY_NON_MATERIAL_METADATA_HINT =
  "Internal notes and non-material metadata changes remain approval-neutral unless explicitly classified.";
