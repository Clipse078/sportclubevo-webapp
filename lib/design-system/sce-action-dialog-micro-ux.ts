/**
 * DS-06 — world-class action / dialog / composer micro-UX contract.
 */
import { SCE_FOUNDATION_FOCUS } from "@/lib/design-system/sce-foundation-contract";
import {
  SCE_MICRO_UX_GOVERNANCE,
  SCE_MICRO_UX_GOVERNANCE_DOC_MARKERS,
} from "@/lib/design-system/sce-micro-ux-governance";

export const SCE_ACTION_DIALOG_MICRO_UX_GOVERNANCE = {
  ...SCE_MICRO_UX_GOVERNANCE,
  WORLD_CLASS_ACTION_DIALOG_MICRO_UX: "PASS",
  ACTION_HIERARCHY_NOT_COLOUR_ALONE: "YES",
  ONE_PRIMARY_PER_CONTEXT: "YES",
  PREMIUM_DOES_NOT_MEAN_OVERSIZED: "YES",
} as const;

export const SCE_ACTION_DIALOG_MICRO_UX_DOC_MARKERS = [
  ...SCE_MICRO_UX_GOVERNANCE_DOC_MARKERS,
  "WORLD_CLASS_ACTION_DIALOG_MICRO_UX",
  "SCE_ACTION_DIALOG_MICRO_UX",
  "ACTION_HIERARCHY_NOT_COLOUR_ALONE",
  "ONE_PRIMARY_PER_CONTEXT",
] as const;

export const SCE_ACTION_MICRO_STATE_MATRIX = {
  PRIMARY: ["default", "hover", "focus", "pressed", "disabled", "loading"],
  SECONDARY: ["default", "hover", "focus", "pressed", "disabled", "loading"],
  TERTIARY: ["default", "hover", "focus", "disabled"],
  DESTRUCTIVE: ["default", "hover", "focus", "pressed", "disabled", "loading"],
  ICON_ACTION: [
    "default",
    "hover",
    "focus",
    "pressed",
    "disabled",
    "touch-target",
    "accessible-name",
  ],
  OVERFLOW_MENU: [
    "trigger",
    "open",
    "item-hover",
    "destructive-item",
    "disabled-item",
    "keyboard",
    "escape",
    "focus-restore",
  ],
} as const;

export const SCE_DIALOG_MICRO_STATE_MATRIX = {
  SHELL: [
    "overlay",
    "title",
    "description",
    "close-affordance",
    "body-scroll",
    "footer-actions",
    "max-size",
    "mobile-adaptation",
  ],
  INTERACTION: [
    "escape",
    "backdrop",
    "focus-entry",
    "focus-trap",
    "focus-restore",
    "loading",
    "validation",
    "long-content",
  ],
} as const;

export const SCE_COMPOSER_MICRO_STATE_MATRIX = {
  FOOTER: [
    "cancel-tertiary",
    "guided-zurueck",
    "guided-weiter",
    "primary-domain-action",
    "save-draft-secondary",
    "submit-loading",
    "actionable-errors",
  ],
  STEPS: ["unvisited", "current", "completed", "error-after-validation"],
} as const;

export const SCE_ACTION_DIALOG_MICRO_PATTERNS_CANONICALISED = [
  "SCE_DIALOG_CLOSE_BUTTON_CLASS",
  "SCE_DIALOG_ACTIONS_ROW_CLASS",
  "SCE_OVERFLOW_MENU_TRIGGER_CLASS",
  "SCE_OVERFLOW_MENU_ITEM_CLASS",
  "SCE_OVERFLOW_MENU_ITEM_DESTRUCTIVE_CLASS",
  "SCE_ICON_BUTTON_TOUCH_TARGET",
  "data-sce-dialog-shell",
  "data-sce-composer-action",
  "data-sce-action-hierarchy",
] as const;

export const SCE_ACTION_DIALOG_MICRO_PATTERNS_DEFERRED = [
  "Full-screen mobile Dialog shell hardening (DS-09)",
  "Global menu surface token unification for all row menus (DS-10)",
  "Typed-name high-friction delete (domain-specific only)",
] as const;

/** Shared close control for Dialog shell — optical alignment with icon actions. */
export const SCE_DIALOG_CLOSE_BUTTON_CLASS = [
  "shrink-0 rounded-lg p-1.5",
  "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
  "transition-colors duration-[120ms]",
  SCE_FOUNDATION_FOCUS,
].join(" ");

/** Footer action row — cancel left / primary right on desktop; stacks on narrow. */
export const SCE_DIALOG_ACTIONS_ROW_CLASS =
  "flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3";

/** Overflow menu trigger — matches Communication calm icon actions. */
export const SCE_OVERFLOW_MENU_TRIGGER_CLASS = [
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent",
  "text-[var(--text-2)] transition-colors",
  "hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
  SCE_FOUNDATION_FOCUS,
].join(" ");

export const SCE_OVERFLOW_MENU_SURFACE_CLASS =
  "w-[min(100vw-2rem,14.5rem)] rounded-[var(--sce-radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-lg)]";

export const SCE_OVERFLOW_MENU_ITEM_CLASS = [
  "flex w-full min-h-[38px] cursor-pointer items-center gap-3 rounded-[0.625rem] px-3 py-2",
  "text-left text-[0.8125rem] font-medium transition-colors",
  "text-[var(--foreground)] hover:bg-[var(--surface-2)]/90",
  SCE_FOUNDATION_FOCUS,
].join(" ");

export const SCE_OVERFLOW_MENU_ITEM_DESTRUCTIVE_CLASS = [
  "flex w-full min-h-[38px] cursor-pointer items-center gap-3 rounded-[0.625rem] px-3 py-2",
  "text-left text-[0.8125rem] font-medium transition-colors",
  "text-[var(--sce-danger)] hover:bg-red-500/10 hover:text-[var(--sce-danger)]",
  SCE_FOUNDATION_FOCUS,
].join(" ");

/** Minimum touch target for icon-only actions (matches Button size=icon height). */
export const SCE_ICON_BUTTON_TOUCH_TARGET_PX = 36;
