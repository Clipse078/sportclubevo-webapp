/**
 * AUFGABEN-06G5 — canonical Requirement platform surface for server/domain consumers.
 * UI and future Mobile/API clients should call these operations rather than redefining rules.
 */

export {
  createRequirementDraft,
  updateRequirementDraft,
  setRequirementDraftAudience,
  setRequirementDraftAudienceSelectors,
  activateRequirement,
  cancelRequirement,
  closeRequirement,
  acknowledgeRequirementRecipient,
  getRequirement,
  listRequirements,
  listRequirementRecipients,
  getRequirementAggregate,
  getOwnRequirementRecipient,
  assertValidRequirementStatusTransition,
} from "./requirement-service";

export { computeRequirementAggregate, isRequirementRecipientOverdue } from "./requirement-aggregate";
export {
  isRequirementDueAtInReminderWindow,
  isRequirementDueAtOverdue,
  openRequirementRecipientOverdueWhere,
  openRequirementRecipientReminderWhere,
} from "./requirement-deadlines";
export {
  resolveRequirementAudiencePersonIds,
  resolveRequirementAudiencePersonIdsFromDraftRows,
  resolveRequirementAudiencePersonIdsFromSnapshot,
} from "./requirement-audience";
export type { RequirementDraftAudienceSnapshot } from "./requirement-audience";
export {
  openAcknowledgeableRequirementRecipientForPersons,
  openAcknowledgeableRequirementRecipientWhere,
} from "./requirement-eligibility";
export {
  canCreateRequirement,
  canManageRequirement,
  canReadRequirement,
  canReadRequirementAggregate,
  canListRequirementRecipients,
  canReadOwnRequirementRecipient,
  canRespondToRequirementRecipient,
  taskPermissionsGrantRequirementManagement,
} from "./requirement-authorization";

export type {
  CreateRequirementDraftInput,
  ListRequirementRecipientsFilter,
  ListRequirementsFilter,
  RequirementAggregateDto,
  RequirementDto,
  RequirementRecipientDto,
  RequirementServiceContext,
  UpdateRequirementDraftInput,
  RequirementDraftAudienceInput,
} from "./types";
