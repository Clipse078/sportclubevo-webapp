export type {
  SceActivityComposerContainerMode,
  SceActivityComposerProps,
  SceActivityComposerResolvedPresentation,
  SceActivityCreateDefinition,
  SceActivityCreateKind,
  SceActivityCreateTabDefinition,
  SceActivityCreateValidationResult,
} from "./types";

export type { SceActivityCreateOriginContext, SceActivityCreateOriginKind } from "./origin-context";
export type {
  SceActivityCreateSuccessOutcome,
  SceActivityCreateSuccessResult,
} from "./success-result";

export { normalizeActivityCreateSuccessOutcome } from "./success-result";

export type {
  SceActivityCreateDraftPersistenceCapability,
  SceActivityCreateResumeDraft,
} from "./draft-persistence-capability";

export {
  SCE_ACTIVITY_CREATE_DRAFT_DELETION_NOT_IN_FOOTER,
  SCE_ACTIVITY_CREATE_SAVE_EXISTING_DRAFT_LABEL,
  SCE_ACTIVITY_CREATE_SAVE_NEW_DRAFT_LABEL,
} from "./draft-persistence-capability";

export {
  SCE_ACTIVITY_COMPOSER_NO_SERVER_AUTOSAVE,
  resolveComposerLifecyclePhase,
  resolveComposerPersistenceStatusLabel,
  type SceActivityComposerLifecyclePhase,
} from "./composer-lifecycle-state";

export { sceActivityDraftsEqual } from "./draft-equality";

export {
  resolveSceActivityComposerSemanticIdentity,
  type SceActivityComposerSemanticIdentity,
} from "./semantic-identity";

export {
  mergeValidationWithFirstTab,
  resolveFirstInvalidTab,
} from "./validation-orchestration";

export { SCE_ACTIVITY_COMPOSER_NESTED_INTERACTION_RULE } from "./nested-interaction-rule";

export {
  SCE_ACTIVITY_COMPOSER_FULLSCREEN_MAX_WIDTH_PX,
  resolveComposerPresentation,
  useComposerResponsivePresentation,
} from "./use-composer-responsive-presentation";

export {
  SCE_ACTIVITY_COMPOSER_CLOSE_CONFIRM_MESSAGE,
  useComposerCloseGuard,
} from "./use-composer-close-guard";
