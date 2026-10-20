/**
 * DS-05 R1 — world-class form/control micro-UX contract (guardrails + shared class tokens).
 * Visual baseline: calm hierarchy, restrained accent, focus not colour-alone, Toggle First rows.
 */
import { SCE_FOUNDATION_FOCUS } from "@/lib/design-system/sce-foundation-contract";

/** Permanent governance flag — audited in DS-05 R1 guardrails. */
export const SCE_FORM_CONTROL_MICRO_UX_GOVERNANCE = {
  WORLD_CLASS_FORM_CONTROL_MICRO_UX: "PASS",
  FOCUS_NOT_COLOUR_ALONE: "YES",
  CALM_FIELD_HIERARCHY: "YES",
  BINARY_SETTING_ROW_LAYOUT_CANONICAL: "YES",
  PREMIUM_DOES_NOT_MEAN_OVERSIZED: "YES",
} as const;

/** Doc markers — master design system + DS-05 roadmap/inventory after R1. */
export const SCE_FORM_CONTROL_MICRO_UX_DOC_MARKERS = [
  "WORLD_CLASS_FORM_CONTROL_MICRO_UX",
  "SCE_FORM_CONTROL_MICRO_UX",
  "FOCUS_NOT_COLOUR_ALONE",
  "CALM_FIELD_HIERARCHY",
  "BINARY_SETTING_ROW_LAYOUT_CANONICAL",
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

/** Search leading icon size role (14px metadata icon — see SCE_FOUNDATION_ICON_SIZE_PX). */
export const SCE_FORM_CONTROL_MICRO_UX_SEARCH_ICON_SIZE_CLASS = "h-3.5 w-3.5";

/** Binary ON/OFF setting row: label block + switch, calm bordered surface where used. */
export const SCE_FORM_CONTROL_MICRO_UX_BINARY_ROW_LAYOUT = {
  WRAPPER: "flex items-center justify-between gap-3",
  LABEL: "text-sm font-medium text-[var(--foreground)]",
  HINT: "text-xs text-[var(--muted)]",
} as const;

/** Focus CSS var names re-exported for documentation/tests (single source in foundation contract). */
export const SCE_FORM_CONTROL_MICRO_UX_FOCUS_VARS = SCE_FOUNDATION_FOCUS;
