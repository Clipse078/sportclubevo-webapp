/**
 * SCE-DESIGN-SYSTEM-06 — canonical action & dialog architecture constants.
 * Consumes DS-02 tokens, DS-05 controls; evolves SceModalOverlay / Dialog / Composer — no parallel modal system.
 */

/** Semantic action hierarchy — hierarchy must not rely on colour alone. */
export const SCE_ACTION_HIERARCHY_LEVELS = [
  "PRIMARY",
  "SECONDARY",
  "TERTIARY_TEXT",
  "DESTRUCTIVE",
  "ICON_ACTION",
] as const;

export type SceActionHierarchyLevel = (typeof SCE_ACTION_HIERARCHY_LEVELS)[number];

/** Maps hierarchy levels to canonical Button variants (icon actions use SceIconButton). */
export const SCE_ACTION_HIERARCHY_BUTTON_VARIANT: Record<
  Exclude<SceActionHierarchyLevel, "ICON_ACTION">,
  "primary" | "secondary" | "ghost" | "danger" | "link"
> = {
  PRIMARY: "primary",
  SECONDARY: "secondary",
  TERTIARY_TEXT: "ghost",
  DESTRUCTIVE: "danger",
};

/** Destructive semantics — confirmation depends on consequence, not the label alone. */
export const SCE_DESTRUCTIVE_ACTION_KINDS = [
  "DESTRUCTIVE_IMMEDIATE",
  "DESTRUCTIVE_REQUIRES_CONFIRMATION",
] as const;

export type SceDestructiveActionKind = (typeof SCE_DESTRUCTIVE_ACTION_KINDS)[number];

/** Where actions belong in the SCE surface stack. */
export const SCE_ACTION_PLACEMENT_ZONES = [
  "WORKSPACE_HEADER",
  "PAGE_ACTIONS",
  "FORM_FOOTER",
  "DIALOG_FOOTER",
  "COMPOSER_FOOTER",
  "CARD_CONTEXTUAL",
  "ROW_COMPACT",
  "OVERFLOW_MENU",
] as const;

export type SceActionPlacementZone = (typeof SCE_ACTION_PLACEMENT_ZONES)[number];

/** Canonical dialog shell — one architecture (SceModalOverlay + Dialog / Composer / Sheet). */
export const SCE_DIALOG_ARCHITECTURE = {
  OVERLAY: "SceModalOverlay",
  FOCUS_TRAP: "useSceModalDialog",
  OPEN_LIFECYCLE: "sce-modal-open-lifecycle",
  STANDARD_SHELL: "Dialog",
  COMPOSER_SHELL: "SceActivityComposer",
  DRAWER_SHELL: "Sheet",
  PARALLEL_MODAL_SYSTEM_ALLOWED: "NO",
} as const;

/** Semantic dialog categories — shared shell, purpose-built content. */
export const SCE_DIALOG_TYPES = [
  "INFORMATIONAL",
  "DECISION",
  "CONFIRMATION",
  "DESTRUCTIVE_CONFIRMATION",
  "FORM_DIALOG",
  "COMPOSER",
] as const;

export type SceDialogType = (typeof SCE_DIALOG_TYPES)[number];

/** Canonical confirmation primitive wraps Dialog — not a second modal stack. */
export const SCE_CONFIRMATION_PRIMITIVE = "SceConfirmDialog" as const;

/** Activity Composer remains canonical — overlay, page fallback, mobile fullscreen, secondaryPanel. */
export const SCE_COMPOSER_ARCHITECTURE_FLAGS = {
  ACTIVITY_COMPOSER_CANONICAL: "YES",
  COMPOSER_REPLACE_ALLOWED: "NO",
  COMPOSER_FREE_TAB_NAVIGATION: "YES",
  COMPOSER_GUIDED_ZURUECK_WEITER: "YES",
  COMPOSER_STEP_OPTIONAL_NOT_COMPLETED: "YES",
  COMPOSER_VALID_NOT_COMPLETED: "YES",
  COMPOSER_UNVISITED_NOT_ERROR: "YES",
  COMPOSER_DIRTY_GUARD: "SceContextDirtyGuardProvider",
} as const;

/** Composer workflow step semantics (unchanged from SCE-ACTIVITY-CREATE). */
export const SCE_COMPOSER_STEP_STATES = [
  "UNVISITED",
  "CURRENT",
  "COMPLETED",
  "ERROR",
] as const;

/** Dirty guard — single canonical provider; no silent data loss. */
export const SCE_DIRTY_GUARD_CONTRACT = {
  PROVIDER: "SceContextDirtyGuardProvider",
  CONFIRM_METHOD: "confirmNavigationIfDirty",
  APPLIES_TO: [
    "COMPOSER_CLOSE",
    "DIALOG_CLOSE_WHEN_WIRED",
    "CONTEXT_TAB_NAVIGATION",
    "ACTIVITY_DETAIL_TABS",
  ],
  CONFIRM_WHEN_CLEAN: "NO",
} as const;

/** Focus management contract for modal dialogs. */
export const SCE_DIALOG_FOCUS_CONTRACT = {
  INITIAL_FOCUS: "title or first focusable via SceModalOverlay.initialFocusRef",
  FOCUS_TRAP: "useSceModalDialog Tab cycle",
  ESCAPE: "onClose when appropriate",
  FOCUS_RESTORE: "sce-modal-open-lifecycle release",
  BACKGROUND_ARIA_HIDDEN: "applySceModalOpenSideEffects",
} as const;

/** Responsive dialog behaviour — full-screen mobile for Composer; Dialog uses shell tokens + DS-09 final pass. */
export const SCE_RESPONSIVE_DIALOG_CONTRACT = {
  DESKTOP: "centered modal / overlay panel",
  MOBILE: "full-viewport-height shell — not shrunk desktop-only card",
  COMPOSER_MOBILE: "full-screen preserved",
  FINAL_HARDENING_OWNER: "SCE-DESIGN-SYSTEM-09",
  STANDARD_DIALOG_MOBILE_ADAPTIVE: "YES",
} as const;

/** Nested modal policy — avoid modal → modal; prefer popover / secondary panel / state transition. */
export const SCE_NESTED_DIALOG_POLICY = {
  AVOID_MODAL_OVER_MODAL: "YES",
  PREFERRED_ALTERNATIVES: [
    "inline search",
    "combobox",
    "popover",
    "expandable region",
    "composer secondaryPanel",
    "same-dialog state transition",
    "full-page fallback",
  ],
  ELEVATED_STACK_LAYER: "SceModalOverlay stackLayer=elevated — documented exception only",
} as const;

export type SceNestedDialogClassification =
  | "MIGRATE_DS06"
  | "MIGRATE_LATER"
  | "JUSTIFIED_EXCEPTION";

export type SceNestedDialogInventoryRow = {
  pattern: string;
  routes: string;
  classification: SceNestedDialogClassification;
  notes: string;
};

/** Inventory of known nested / elevated modal patterns (DS-06 audit). */
export const SCE_NESTED_DIALOG_INVENTORY: SceNestedDialogInventoryRow[] = [
  {
    pattern: "SceClubTeamSelectorDialog over SceActivityComposer",
    routes: "activity create / tournament external club",
    classification: "JUSTIFIED_EXCEPTION",
    notes:
      "Elevated stackLayer; club discovery over composer — migrate to combobox/secondaryPanel when DS-10 allows",
  },
  {
    pattern: "PlanningHubManipulationModalShell elevated",
    routes: "planning hub conflict / manipulation",
    classification: "JUSTIFIED_EXCEPTION",
    notes: "Operational dense UX; elevated layer over hub workspace dialog",
  },
  {
    pattern: "Legacy local confirm overlays (inline state, no SceModalOverlay)",
    routes: "admin forms, registrations",
    classification: "MIGRATE_LATER",
    notes: "Adopt Dialog / SceConfirmDialog in DS-10 sweep",
  },
  {
    pattern: "Modal picker opening second modal (SharedComponentPicker et al.)",
    routes: "reusable components library",
    classification: "MIGRATE_LATER",
    notes: "Prefer single dialog state machine or full-page picker",
  },
];
