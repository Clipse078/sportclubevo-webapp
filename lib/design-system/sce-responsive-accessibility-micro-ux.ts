/**
 * DS-09 — shared responsive & accessibility micro-UX class recipes.
 */
import { SCE_FOUNDATION_FOCUS } from "@/lib/design-system/sce-foundation-contract";
import {
  SCE_MICRO_UX_GOVERNANCE,
  SCE_MICRO_UX_GOVERNANCE_DOC_MARKERS,
} from "@/lib/design-system/sce-micro-ux-governance";

export const SCE_RESPONSIVE_ACCESSIBILITY_MICRO_UX_GOVERNANCE = {
  ...SCE_MICRO_UX_GOVERNANCE,
  MICRO_RESPONSIVE_QUALITY: "PASS",
  MICRO_ACCESSIBILITY: "PASS",
  WORLD_CLASS_RESPONSIVE_ACCESSIBILITY_MICRO_UX: "PASS",
} as const;

export const SCE_RESPONSIVE_ACCESSIBILITY_MICRO_UX_DOC_MARKERS = [
  ...SCE_MICRO_UX_GOVERNANCE_DOC_MARKERS,
  "SCE_RESPONSIVE_ACCESSIBILITY_MICRO_UX",
  "WORLD_CLASS_RESPONSIVE_ACCESSIBILITY_MICRO_UX",
  "SCE_PAGE_OVERFLOW_GUARD_CLASS",
  "SCE_TEXT_EXPANSION_SAFE_CLASS",
  "SCE_TOUCH_TARGET_INTERACTIVE_CLASS",
  "SCE_DIALOG_MOBILE_SHELL_CLASS",
  "SCE_DENSE_TOOLBAR_RESPONSIVE_GRID_CLASS",
  "SCE_WORKSPACE_HEADER_ACTIONS_CLASS",
] as const;

/** Prevent accidental page-level horizontal scroll — apply to authenticated main columns. */
export const SCE_PAGE_OVERFLOW_GUARD_CLASS = "min-w-0 overflow-x-clip max-w-full";

/** Long labels, German copy, club names — wrap instead of clipping page layout. */
export const SCE_TEXT_EXPANSION_SAFE_CLASS = "min-w-0 break-words [overflow-wrap:anywhere]";

/** Coarse pointer / mobile — 44px min target; desktop may stay compact. */
export const SCE_TOUCH_TARGET_INTERACTIVE_CLASS = [
  "min-h-11 min-w-11",
  "max-md:min-h-11 max-md:min-w-11",
  "md:min-h-0 md:min-w-0",
].join(" ");

/** Icon-only actions — compact on desktop, touch-safe on narrow viewports. */
export const SCE_ICON_BUTTON_TOUCH_TARGET_CLASS = [
  "inline-flex items-center justify-center",
  "max-md:min-h-11 max-md:min-w-11 max-md:p-2",
  SCE_FOUNDATION_FOCUS,
].join(" ");

/** Mobile dialog — fills content viewport; not a shrunk desktop-only card. */
export const SCE_DIALOG_MOBILE_SHELL_CLASS =
  "max-md:min-h-0 max-md:w-full max-md:max-w-none max-md:flex-1";

/** Dense toolbar filter row — intentional stack on narrow widths. */
export const SCE_DENSE_TOOLBAR_RESPONSIVE_GRID_CLASS =
  "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center";

/** Workspace header actions — stack below title until lg. */
export const SCE_WORKSPACE_HEADER_ACTIONS_CLASS =
  "flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end";

/** Focus ring recipe for mobile bottom navigation items. */
export const SCE_MOBILE_BOTTOM_NAV_ITEM_FOCUS_CLASS = [
  "outline-none focus-visible:outline focus-visible:outline-2",
  "focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--sce-focus-ring-color)]",
].join(" ");
