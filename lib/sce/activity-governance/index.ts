export type {
  SceActivityApprovalDecision,
  SceActivityApprovalStrategyKind,
  SceActivityClubGovernancePolicy,
  SceActivityCreatorPublicationPolicy,
  SceActivityEffectiveGovernance,
  SceActivityGovernancePersonRef,
  SceActivityGovernanceState,
  SceActivityPublicationAuthority,
  SceActivityTypeGovernancePolicy,
} from "./types";

export {
  SCE_ACTIVITY_DEFAULT_APPROVAL_STRATEGY,
  SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
} from "./types";

export {
  SCE_ACTIVITY_APPROVE_PERMISSION_PLANNED_BY_TYPE,
  SCE_ACTIVITY_CREATE_PERMISSION_BY_TYPE,
  personHasAnyPermission,
  resolveCreatePermissionKeysForActivityType,
  type SceActivityGovernanceCapability,
} from "./capability-semantics";

export {
  resolveComposerEffectiveGovernanceOrDefault,
  resolveEffectiveActivityGovernance,
  type ResolveEffectiveGovernanceInput,
} from "./resolve-effective-governance";

export {
  assertActivityGovernanceConfigurationValid,
  SCE_ACTIVITY_GOVERNANCE_VALIDATOR_REMOVAL_LIFECYCLE,
  validateActivityGovernanceConfiguration,
  type SceActivityGovernanceConfigurationIssue,
} from "./configuration-validation";

export {
  assertApproverMayDecide,
  isApprovalCompleteForRevision,
  validatorMayApproveWithoutCreatePermission,
  type AssertApproverMayDecideInput,
  type AssertApproverMayDecideResult,
  type EvaluateApprovalCompletionInput,
} from "./approval-rules";

export type {
  SceActivityApprovalRecord,
  SceActivityGovernanceRevisionRef,
  SceActivityGovernanceSubmission,
  SceActivityMaterialChangeCategory,
  SceActivityMaterialChangeInput,
} from "./revision-model";

export {
  approvalAppliesToRevision,
  materialChangeInvalidatesApproval,
  SCE_ACTIVITY_NON_MATERIAL_METADATA_HINT,
} from "./revision-model";

export type {
  SceActivityGovernanceAuditEvent,
  SceActivityGovernanceAuditEventKind,
  SceActivityGovernanceAuditTrail,
} from "./audit-contract";

export {
  SCE_ACTIVITY_GOVERNANCE_NOTIFICATION_EVENTS,
  type SceActivityGovernanceNotificationEventKind,
  type SceActivityGovernanceNotificationPayload,
} from "./notification-events";

export type {
  SceActivityGovernanceCentricTypeSection,
  SceActivityGovernanceCentricView,
  SceActivityPersonCentricGovernanceRow,
  SceActivityPersonCentricGovernanceView,
} from "./admin-ux-contract";

export { SCE_ACTIVITY_GOVERNANCE_ADMIN_UI_DEFERRED } from "./admin-ux-contract";

export type {
  SceActivityApprovalInboxItem,
  SceActivityApprovalInboxReviewAction,
} from "./approval-inbox-contract";

export {
  SCE_ACTIVITY_APPROVAL_INBOX_ACTION_LABELS,
  SCE_ACTIVITY_APPROVAL_INBOX_DEFERRED,
  SCE_ACTIVITY_APPROVAL_INBOX_PRESENTATION_REUSE,
} from "./approval-inbox-contract";

export {
  resolveActivityComposerCommitActionLabel,
  resolveCommitSuccessOutcome,
  resolveComposerCommitActionLabelFromGovernance,
  SCE_ACTIVITY_DRAFT_SAVE_NEVER_SUBMITS_FOR_APPROVAL,
} from "./composer-integration";
