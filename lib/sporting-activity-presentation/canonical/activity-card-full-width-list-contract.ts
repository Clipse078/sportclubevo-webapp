import { cn } from "@/lib/cn";

/** SCE-DS2-04R2 — one canonical activity card per full-width list row (no multi-column card grids). */
export const SCE_ACTIVITY_CARD_FULL_WIDTH_LAYOUT_MARKER = "horizontal-full-width" as const;

export const SCE_ACTIVITY_CARD_LIST_LAYOUT_ATTR = "data-sce-activity-card-layout" as const;

/**
 * Programme / Resultate / Matchcenter list containers — single column only on sm+.
 * @see SCE-DS2-04R2
 */
export const SCE_ACTIVITY_CARD_LIST_CONTAINER_CLASS = cn(
  "flex w-full min-w-0 flex-col gap-3",
  "data-[sce-activity-card-layout=horizontal-full-width]:gap-3",
);

/** Ol wrapper variant — preserves list semantics for Cockpit / Matchcenter sections. */
export const SCE_ACTIVITY_CARD_LIST_OL_CLASS = cn(
  SCE_ACTIVITY_CARD_LIST_CONTAINER_CLASS,
  "list-none p-0",
);

export const SCE_ACTIVITY_CARD_LIST_ITEM_CLASS = "min-w-0 w-full";

/**
 * Guard patterns — desktop fixture lists must not regress to multi-column card grids.
 * Contract tests scan consuming modules for these classes outside KPI / unrelated UI.
 */
export const SCE_ACTIVITY_CARD_FORBIDDEN_DESKTOP_GRID_PATTERNS = [
  "sm:grid-cols-2 xl:grid-cols-3",
  "sm:grid-cols-2 lg:grid-cols-3",
] as const;

/** Shared horizontal operational row (training / tournament / club event programme lists). */
export const SCE_ACTIVITY_HORIZONTAL_OPERATIONAL_ROW_CLASS = cn(
  "flex min-w-0 w-full flex-col gap-2",
  "sm:grid sm:grid-cols-[minmax(0,6.5rem)_minmax(0,5.5rem)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]",
  "sm:items-center sm:gap-x-3 sm:gap-y-1",
);

export function sceActivityCardListContainerProps(): {
  className: string;
  [SCE_ACTIVITY_CARD_LIST_LAYOUT_ATTR]: typeof SCE_ACTIVITY_CARD_FULL_WIDTH_LAYOUT_MARKER;
} {
  return {
    className: SCE_ACTIVITY_CARD_LIST_CONTAINER_CLASS,
    [SCE_ACTIVITY_CARD_LIST_LAYOUT_ATTR]: SCE_ACTIVITY_CARD_FULL_WIDTH_LAYOUT_MARKER,
  };
}

export function sceActivityCardListOlProps(): {
  className: string;
  [SCE_ACTIVITY_CARD_LIST_LAYOUT_ATTR]: typeof SCE_ACTIVITY_CARD_FULL_WIDTH_LAYOUT_MARKER;
} {
  return {
    className: SCE_ACTIVITY_CARD_LIST_OL_CLASS,
    [SCE_ACTIVITY_CARD_LIST_LAYOUT_ATTR]: SCE_ACTIVITY_CARD_FULL_WIDTH_LAYOUT_MARKER,
  };
}
