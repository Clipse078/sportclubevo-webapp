import { cn } from "@/lib/cn";

/**
 * SCE-PLANNER-OPS-01 — shared Wochenplaner Liste expansion + overflow menu geometry.
 * Overflow menu is overlay-positioned; the expansion chevron row spans the full card width.
 */
export const PLANNING_HUB_LISTE_ROW_INTERACTION_SHELL_CLASS = "relative min-w-0 w-full";

export const PLANNING_HUB_LISTE_MENU_ANCHOR_CLASS = cn(
  "absolute right-2 top-2 z-[2]",
  "sm:right-3 sm:top-3",
);

/** Reserve top-trailing space on narrow viewports so fixture / card bodies clear the menu. */
export const PLANNING_HUB_LISTE_SUMMARY_MENU_CLEARANCE_CLASS = "min-w-0 w-full max-md:pr-8";

export const PLANNING_HUB_LISTE_MEASURED_ROW_CLASS = "min-w-0 w-full flex-1 self-stretch";
