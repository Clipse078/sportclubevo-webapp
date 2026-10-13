import type {
  SceActivityApprovalDecision,
  SceActivityGovernanceState,
  SceActivityPublicationAuthority,
} from "./types";

/** Append-only audit events for governance — do not rely on mutable status fields alone. */
export type SceActivityGovernanceAuditEventKind =
  | "SUBMITTED_FOR_APPROVAL"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "PUBLISHED"
  | "RESUBMITTED"
  | "POLICY_SNAPSHOT";

export type SceActivityGovernanceAuditEvent = {
  kind: SceActivityGovernanceAuditEventKind;
  activityId: string;
  revisionId: string;
  actorPersonId: string;
  occurredAt: string;
  comment?: string;
  governanceStateAfter?: SceActivityGovernanceState;
  policySnapshot?: {
    publicationAuthority: SceActivityPublicationAuthority;
    validatorPersonIds: readonly string[];
  };
  decision?: SceActivityApprovalDecision;
};

export type SceActivityGovernanceAuditTrail = {
  activityId: string;
  events: readonly SceActivityGovernanceAuditEvent[];
};
