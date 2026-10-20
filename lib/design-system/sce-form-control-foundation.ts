/**
 * SCE Design System — form & control architecture (DS-05).
 * Visual tokens remain in app/globals.css (`.fca-input`, `.fca-label`, …).
 */
import type { SceFoundationDensityTier } from "@/lib/design-system/sce-foundation-contract";

/** Canonical form-field composition layers (not every field renders every layer). */
export const SCE_FORM_FIELD_LAYERS = [
  "LABEL",
  "CONTROL",
  "DESCRIPTION",
  "VALIDATION",
  "STATUS",
] as const;

export type SceFormFieldLayer = (typeof SCE_FORM_FIELD_LAYERS)[number];

/** Validation presentation — UNVISITED ≠ ERROR (Activity Composer principle). */
export const SCE_FORM_VALIDATION_PRESENTATION = {
  UNVISITED_NOT_ERROR: "YES",
  FIELD_LEVEL: "YES",
  FORM_LEVEL: "ValidationSummary",
  SERVER_ASYNC: "YES",
  WARNING_NON_BLOCKING: "YES",
} as const;

/** Disabled vs read-only semantics (DS-05). */
export const SCE_FORM_CONTROL_INTERACTION = {
  DISABLED: "cannot interact — muted control styling",
  READ_ONLY: "value visible and meaningful — not editable; do not reuse disabled styling",
} as const;

/** Select vs combobox decision guide. */
export const SCE_FORM_SELECTION_SEMANTICS = {
  SELECT: "choose one from a reasonably bounded set",
  COMBOBOX: "search/filter/select when discovery is needed",
} as const;

export const SCE_FORM_DENSITY_DEFAULT: SceFoundationDensityTier = "COMFORTABLE";

/** Shared search field CSS contract (leading icon + optional clear). */
export const SCE_SEARCH_FIELD_INPUT_CLASS = "fca-input fca-search-input";
export const SCE_SEARCH_FIELD_INPUT_WITH_CLEAR_CLASS =
  "fca-input fca-search-input fca-combobox-input";

export const SCE_SEARCH_FIELD_MARKERS = {
  leadingIcon: "data-sce-search-leading-icon",
  trailingClear: "data-sce-search-trailing-clear",
} as const;
