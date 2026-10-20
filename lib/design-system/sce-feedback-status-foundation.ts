/**
 * SCE-DESIGN-SYSTEM-07 — semantic feedback, readiness, empty, loading & error contracts.
 */

export const SCE_SEMANTIC_FEEDBACK_TONES = [
  "SUCCESS",
  "WARNING",
  "ERROR",
  "INFO",
  "NEUTRAL",
] as const;

export type SceSemanticFeedbackTone = (typeof SCE_SEMANTIC_FEEDBACK_TONES)[number];

/** Semantic meaning must never depend on colour alone — icon + text required. */
export const SCE_SEMANTIC_FEEDBACK_CONTRACT = {
  COLOUR_ONLY_SEMANTICS_ALLOWED: "NO",
  ICON_AND_TEXT_REQUIRED: "YES",
  OPTIONAL_TITLE: "YES",
  OPTIONAL_DESCRIPTION: "YES",
  OPTIONAL_CONTEXTUAL_ACTION: "YES",
} as const;

export const SCE_EMPTY_STATE_VARIANTS = [
  "FIRST_USE",
  "NO_DATA",
  "NO_RESULTS",
  "FILTERED_NO_RESULTS",
  "NOT_CONFIGURED",
  "NOT_AVAILABLE",
  "PERMISSION_LIMITED",
] as const;

export type SceEmptyStateVariant = (typeof SCE_EMPTY_STATE_VARIANTS)[number];

export const SCE_EMPTY_STATE_DISTINCTIONS = {
  EMPTY_IS_NOT_ERROR: "YES",
  NO_RESULTS_IS_NOT_FIRST_USE: "YES",
  NOT_CONFIGURED_IS_NOT_ERROR: "YES",
  PERMISSION_LIMITED_IS_NOT_EMPTY_DATA: "YES",
  PREMIUM_DOES_NOT_MEAN_OVERSIZED: "YES",
  EMPTY_STATE_CONTAINMENT_REQUIRED: "YES",
  EMPTY_STATE_OVERSIZING_ALLOWED: "NO",
  EMPTY_STATE_CONTEXTUAL_ACTION_REQUIRED_WHERE_USEFUL: "YES",
} as const;

/** Feedback belongs to the smallest meaningful functional context (DS-07 R1). */
export const SCE_FEEDBACK_CONTEXT_RULE = {
  FEEDBACK_NEAREST_MEANINGFUL_CONTEXT: "YES",
  TOAST_AS_DEFAULT_ERROR_PATTERN: "NO",
  MODAL_AS_DEFAULT_ERROR_PATTERN: "NO",
  FIELD_VALIDATION_AT_FIELD: "YES",
  LOCAL_OPERATION_AT_SECTION: "YES",
  WORKSPACE_LOAD_AT_WORKSPACE_SURFACE: "YES",
} as const;

export const SCE_LOADING_HIERARCHY = {
  IMMEDIATE_CONTROL: "Button/control loading state",
  LOCAL_CONTENT_REFRESH: "Restrained local progress near content",
  STRUCTURED_CONTENT: "Skeleton matching expected geometry",
  FULL_WORKSPACE_INITIAL: "Coherent workspace skeleton — no giant unrelated spinner",
  LAYOUT_STABILITY_DURING_LOADING_REQUIRED: "YES",
  FULL_SCREEN_SPINNER_DEFAULT: "NO",
} as const;

export type SceLoadingTreatment =
  | "CONTROL"
  | "LOCAL"
  | "SKELETON"
  | "WORKSPACE_SKELETON";

export const SCE_SKELETON_RECIPES = [
  "workspace-header",
  "card",
  "list-row",
  "table-row",
  "people-access-list",
  "readiness-panel",
  "page",
  "list",
  "form",
  "table",
] as const;

export type SceSkeletonRecipe = (typeof SCE_SKELETON_RECIPES)[number];

export const SCE_ACTIONABLE_ERROR_CONTRACT = {
  ACTIONABLE_ERROR_UX_REQUIRED: "YES",
  GENERIC_INTERNAL_ERROR_AS_DEFAULT: "NO",
  RECOVERY_ACTION_REQUIRED_WHERE_POSSIBLE: "YES",
  TECHNICAL_DETAILS_EXPOSED_TO_USER: "NO",
  GENERIC_INTERNAL_ERROR_FALLBACK: "Interner Fehler",
} as const;

export const SCE_READINESS_STATUS_PANEL_CONTRACT = {
  PRIMITIVE: "SceReadinessStatusPanel",
  SUPPORTS_TITLE: "YES",
  SUPPORTS_DESCRIPTION: "YES",
  SUPPORTS_STATUS_ROWS: "YES",
  SUPPORTS_COMPACT_AND_STANDARD: "YES",
  CARD_SOUP_FOR_EVERY_STATUS: "NO",
  READINESS_VISUAL_DNA_SHARED: "YES",
  READINESS_DOMAIN_DENSITY_ALLOWED: "YES",
  LOCAL_READINESS_RESTYLING_ALLOWED: "NO",
} as const;

export const SCE_INLINE_FEEDBACK_GUIDANCE = {
  TOAST_FOR_EVERYTHING: "NO",
  FEEDBACK_NEAR_USER_ACTION: "YES",
  DUPLICATE_FEEDBACK_SAME_OPERATION: "AVOID",
  FIELD_VALIDATION_INLINE: "YES",
  PERSISTENT_WORKSPACE_FEEDBACK: "YES",
  READINESS_STATUS_PANEL: "YES",
} as const;

export const SCE_STATUS_BADGE_GUIDANCE = {
  PARALLEL_STATUS_PILL_FAMILY: "NO",
  TEXT_REQUIRED: "YES",
  COLOUR_ONLY_SEMANTICS: "NO",
  ACTIVITY_TYPE_SEMANTICS_SEPARATE: "YES",
} as const;

export type SceReadinessStatusRow = {
  id: string;
  label: string;
  detail?: string;
  tone: SceSemanticFeedbackTone;
  /** Visible state label (never colour-only). */
  stateLabel: string;
};

export type SceActionableErrorPresentation = {
  title: string;
  description: string;
  retryLabel?: string;
  nextActionLabel?: string;
  technicalReference?: string;
};
