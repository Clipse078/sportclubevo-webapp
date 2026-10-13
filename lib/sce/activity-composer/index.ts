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
export type { SceActivityCreateSuccessResult } from "./success-result";

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
