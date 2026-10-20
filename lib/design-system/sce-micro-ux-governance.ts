/**
 * Permanent SCE Design System micro-UX / micro-visual quality governance.
 * Applies to DS-05 and all subsequent packages; DS-10 treats unexplained drift as debt.
 */

/** Quality formula — architecture alone is insufficient without micro detail. */
export const SCE_WORLD_CLASS_SCE_QUALITY =
  "MACRO_ARCHITECTURE + COMPONENT_QUALITY + MICRO_DETAIL_QUALITY" as const;

/** Programme-wide governance flags (PO addendum — permanent). */
export const SCE_MICRO_UX_GOVERNANCE = {
  WORLD_CLASS_MICRO_UX_REQUIRED: "YES",
  MICRO_STATE_COVERAGE_REQUIRED: "YES",
  MICRO_ALIGNMENT_CONSISTENCY_REQUIRED: "YES",
  MICRO_RESPONSIVE_QUALITY_REQUIRED: "YES",
  MICRO_ACCESSIBILITY_REQUIRED: "YES",
  LOCAL_MICRO_PATTERN_DRIFT_ALLOWED: "NO",
  UNEXPLAINED_MICRO_PATTERN_DRIFT_ALLOWED_AT_DS10_CLOSURE: "NO",
} as const;

/** Must appear in docs/design/SCE-DESIGN-SYSTEM.md after adoption. */
export const SCE_MICRO_UX_GOVERNANCE_DOC_MARKERS = [
  "WORLD_CLASS_MICRO_UX_REQUIRED",
  "MICRO_STATE_COVERAGE_REQUIRED",
  "MICRO_ALIGNMENT_CONSISTENCY_REQUIRED",
  "MICRO_RESPONSIVE_QUALITY_REQUIRED",
  "MICRO_ACCESSIBILITY_REQUIRED",
  "LOCAL_MICRO_PATTERN_DRIFT_ALLOWED",
  "WORLD_CLASS_SCE_QUALITY",
  "MICRO HIERARCHY",
] as const;

/**
 * PO visual reference areas — extract micro quality, do not copy layouts.
 * Communication/Mail, Dashboard, global nav, match cards, Wochenplaner, Tournament/Spielplan.
 */
export const SCE_MICRO_UX_VISUAL_REFERENCE_AREAS = [
  "Communication / Mail Inbox",
  "Dashboard",
  "Global navigation",
  "SCE Match Cards",
  "Wochenplaner",
  "Tournament / Spielplan",
] as const;

/** Micro hierarchy — supporting affordances must not compete with primary content. */
export const SCE_MICRO_UX_HIERARCHY_LAYERS = [
  "PRIMARY_CONTENT",
  "SECONDARY_CONTENT",
  "METADATA",
  "SUPPORTING_AFFORDANCE",
] as const;
