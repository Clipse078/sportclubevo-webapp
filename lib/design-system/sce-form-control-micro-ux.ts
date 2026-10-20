/**
 * DS-05 R1 — world-class form/control micro-UX contract (guardrails + shared class tokens).
 * Visual baseline: calm hierarchy, restrained accent, focus not colour-alone, Toggle First rows.
 */
import { SCE_FOUNDATION_FOCUS, SCE_FOUNDATION_ICON_SIZE_PX } from "@/lib/design-system/sce-foundation-contract";
import {
  SCE_MICRO_UX_GOVERNANCE,
  SCE_MICRO_UX_GOVERNANCE_DOC_MARKERS,
} from "@/lib/design-system/sce-micro-ux-governance";

/** DS-05 form/control micro governance — extends programme-wide SCE_MICRO_UX_GOVERNANCE. */
export const SCE_FORM_CONTROL_MICRO_UX_GOVERNANCE = {
  ...SCE_MICRO_UX_GOVERNANCE,
  WORLD_CLASS_FORM_CONTROL_MICRO_UX: "PASS",
  FOCUS_NOT_COLOUR_ALONE: "YES",
  CALM_FIELD_HIERARCHY: "YES",
  BINARY_SETTING_ROW_LAYOUT_CANONICAL: "YES",
  PREMIUM_DOES_NOT_MEAN_OVERSIZED: "YES",
} as const;

/** Doc markers — master design system + DS-05 roadmap/inventory after R1. */
export const SCE_FORM_CONTROL_MICRO_UX_DOC_MARKERS = [
  ...SCE_MICRO_UX_GOVERNANCE_DOC_MARKERS,
  "WORLD_CLASS_FORM_CONTROL_MICRO_UX",
  "SCE_FORM_CONTROL_MICRO_UX",
  "FOCUS_NOT_COLOUR_ALONE",
  "CALM_FIELD_HIERARCHY",
  "BINARY_SETTING_ROW_LAYOUT_CANONICAL",
] as const;

/** Micro-state matrices audited for DS-05 canonical primitives (R1). */
export const SCE_FORM_CONTROL_MICRO_STATE_MATRIX = {
  TEXT_INPUT: [
    "empty",
    "populated",
    "placeholder",
    "focus",
    "invalid",
    "disabled",
    "read-only",
  ],
  TEXTAREA: [
    "empty",
    "populated",
    "placeholder",
    "focus",
    "invalid",
    "disabled",
    "read-only",
    "long-content",
  ],
  SEARCH: ["empty", "populated", "focus", "clear-action", "disabled", "compact"],
  SELECT: ["closed", "focus", "disabled", "dropdown-indicator"],
  COMBOBOX: ["open", "loading", "empty-results", "keyboard-navigation"],
  SWITCH_TOGGLE: ["on", "off", "hover", "focus", "disabled", "label-alignment"],
  CHECKBOX: ["unchecked", "checked", "focus", "disabled", "multi-select", "row-select"],
  SEGMENTED_CHOICE: ["selected", "unselected", "hover", "focus", "disabled", "keyboard"],
  DATE_TIME: [
    "empty",
    "populated",
    "focus",
    "invalid",
    "disabled",
    "picker-affordance",
    "compact",
    "responsive-stack",
  ],
  VALIDATION: [
    "field-error-text",
    "field-border-state",
    "aria-association",
    "control-error-spacing",
    "no-colour-alone",
  ],
} as const;

/** Canonicalised micro recipes in DS-05 R1 (shared tokens/classes). */
export const SCE_FORM_CONTROL_MICRO_PATTERNS_CANONICALISED = [
  "SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS",
  "SCE_FORM_CONTROL_MICRO_UX_FIELD_STACK_CLASS",
  "SCE_FORM_CONTROL_MICRO_UX_FIELD_ERROR_CLASS",
  "SCE_FORM_CONTROL_MICRO_UX_INVALID_INPUT_CLASS",
  "SCE_FORM_CONTROL_MICRO_UX_SEARCH_ICON_SIZE_CLASS",
  "SCE_FORM_CONTROL_MICRO_UX_BINARY_ROW_LAYOUT",
  "SCE_FORM_CONTROL_MICRO_UX_MARKERS",
  "fca-input / fca-textarea / fca-select global tokens",
] as const;

/** Deferred to DS-09 / DS-10 — documented as migration debt, not silent drift. */
export const SCE_FORM_CONTROL_MICRO_PATTERNS_DEFERRED = [
  "SceListSelectorPanel — full open/loading/empty micro matrix product-wide",
  "Legacy admin native selects outside SceToolbarSelect token recipe",
  "CampaignComposer / VorlageManagementForm mixed control micro audit",
  "Infoboard designer panel control heights and hover backgrounds",
  "LayoutConfigPanel CMS designer — legacy orange selection chrome (non-responsive rows)",
  "Keyboard shortcut hints on search fields (where Communication reference uses them)",
] as const;

/** DOM markers for primitive/adoption audits (stable contracts for tests). */
export const SCE_FORM_CONTROL_MICRO_UX_MARKERS = {
  FORM_FIELD: "data-sce-form-field",
  TEXT_INPUT: "data-sce-text-input",
  TEXTAREA: "data-sce-textarea",
  SEARCH_FIELD: "data-sce-search-field",
  TOOLBAR_SELECT: "data-sce-toolbar-select",
  ACTIVITY_DATE: "data-sce-activity-date-input",
  ACTIVITY_TIME: "data-sce-activity-time-input",
  ACTIVITY_DATE_TIME_LAYOUT: "data-sce-activity-datetime-layout",
  SEGMENTED_CONTROL: "data-sce-segmented-control",
  SWITCH_TOGGLE_ROW: "data-sce-switch-toggle-row",
  BINARY_SETTING_ROW: "data-sce-binary-setting-row",
} as const;

/** Vertical rhythm between label, helper, control, validation (matches SceFormField + activity fields). */
export const SCE_FORM_CONTROL_MICRO_UX_FIELD_STACK_CLASS = "space-y-1.5";

/** Shared focus-visible ring — must stay aligned with SCE_FOUNDATION_FOCUS tokens. */
export const SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sce-color-app-background)]";

/** Required indicator — semantic error token, not raw palette names. */
export const SCE_FORM_CONTROL_MICRO_UX_REQUIRED_MARKER_CLASS =
  "text-[var(--sce-color-status-error)]";

/** Field-level validation line — pairs with role="alert" on errors. */
export const SCE_FORM_CONTROL_MICRO_UX_FIELD_ERROR_CLASS =
  "text-xs font-medium text-[var(--sce-color-status-error)]";

/** Invalid text control border emphasis (works atop `.fca-input`). */
export const SCE_FORM_CONTROL_MICRO_UX_INVALID_INPUT_CLASS =
  "border-[var(--sce-danger-border)] focus:border-[var(--sce-danger)]";

/** Search leading icon size role (14px metadata icon — SCE_FOUNDATION_ICON_SIZE_PX.metadata). */
export const SCE_FORM_CONTROL_MICRO_UX_SEARCH_ICON_SIZE_CLASS = "h-3.5 w-3.5";

/** Toolbar/select chevron — 16px control icon role. */
export const SCE_FORM_CONTROL_MICRO_UX_SELECT_CHEVRON_SIZE_CLASS = "h-4 w-4";

/** Minimum touch target for search clear / trailing icon actions (28px). */
export const SCE_FORM_CONTROL_MICRO_UX_ICON_ACTION_TOUCH_CLASS = "h-7 w-7";

/** Canonical metadata icon size (px) — guardrails reference only. */
export const SCE_FORM_CONTROL_MICRO_UX_SEARCH_ICON_PX = SCE_FOUNDATION_ICON_SIZE_PX.metadata;

/** Binary ON/OFF setting row: label block + switch, calm bordered surface where used. */
export const SCE_FORM_CONTROL_MICRO_UX_BINARY_ROW_LAYOUT = {
  WRAPPER: "flex items-center justify-between gap-3",
  LABEL: "text-sm font-medium text-[var(--foreground)]",
  HINT: "text-xs text-[var(--muted)]",
} as const;

/** Focus CSS var names re-exported for documentation/tests (single source in foundation contract). */
export const SCE_FORM_CONTROL_MICRO_UX_FOCUS_VARS = SCE_FOUNDATION_FOCUS;
