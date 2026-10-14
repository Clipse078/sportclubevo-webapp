import { cn } from "@/lib/cn";

/**
 * Shared desktop column template: TIME | IDENTITY | LOCATION | STATUS | ACTIONS
 *
 * R4.4 invariant: only IDENTITY is flexible (`1fr`). TIME, LOCATION, STATUS, and ACTIONS use
 * fixed tracks so column-3 X-origin never shifts when status badge width or identity content changes.
 */
export const PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS =
  "md:grid-cols-[5rem_minmax(0,1fr)_10rem_6.5rem_2.5rem]";

export const PLANNING_HUB_LISTE_ROW_GRID_CLASS = cn(
  "grid grid-cols-1 gap-2",
  PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS,
  "md:items-center md:gap-x-3",
);

/** @deprecated R4.3 inner grid — liste rows use a single outer grid since R4.3; kept for reference tests. */
export const PLANNING_HUB_LISTE_ROW_INNER_GRID_CLASS = cn(
  "col-span-full grid grid-cols-1 gap-2 min-w-0",
  "md:col-span-4 md:col-start-1 md:grid-cols-[5rem_minmax(0,1fr)_10rem_6.5rem]",
  "md:items-center md:gap-x-3",
);

/** Explicit desktop column ownership — operational columns must not shift with identity intrinsic width. */
export const PLANNING_HUB_LISTE_ROW_COLUMN_CLASS = {
  time: "min-w-0 md:col-start-1 md:row-start-1 md:w-full",
  identity: "min-w-0 max-w-full overflow-hidden md:col-start-2 md:row-start-1",
  location: "min-w-0 md:col-start-3 md:row-start-1 md:w-full",
  status:
    "min-w-0 md:col-start-4 md:row-start-1 md:w-full md:max-w-full md:justify-self-start",
  actions: "md:col-start-5 md:row-start-1 md:w-full md:justify-self-end",
} as const;

/** Canonical Wochenplaner Liste location cell — one owner, one geometry for all activity kinds. */
export const PLANNING_HUB_LISTE_LOCATION_CELL_CLASS = cn(
  PLANNING_HUB_LISTE_ROW_COLUMN_CLASS.location,
  "inline-flex min-w-0 items-start gap-1.5 text-[0.8125rem] leading-snug text-[var(--text-2)] md:pt-0.5",
);

/** Fixed icon slot so pin left edge aligns across rows (independent of location text length). */
export const PLANNING_HUB_LISTE_LOCATION_ICON_SLOT_CLASS =
  "mt-0.5 hidden h-3.5 w-3.5 shrink-0 md:inline-flex md:items-center md:justify-center md:opacity-70";

export type PlanningHubListeRowGridColumn = keyof typeof PLANNING_HUB_LISTE_ROW_COLUMN_CLASS;
