import { cn } from "@/lib/cn";

/** Shared desktop column template: TIME | IDENTITY | LOCATION | STATUS | ACTIONS */
export const PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS =
  "md:grid-cols-[minmax(4.75rem,0.55fr)_minmax(0,1.65fr)_minmax(0,1fr)_auto_2.5rem]";

export const PLANNING_HUB_LISTE_ROW_GRID_CLASS = cn(
  "grid grid-cols-1 gap-2",
  PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS,
  "md:items-center md:gap-x-3",
);

export const PLANNING_HUB_LISTE_ROW_INNER_GRID_CLASS = cn(
  "col-span-full grid grid-cols-1 gap-2 min-w-0",
  "md:col-span-4 md:col-start-1 md:grid-cols-[minmax(4.75rem,0.55fr)_minmax(0,1.65fr)_minmax(0,1fr)_auto]",
  "md:items-center md:gap-x-3",
);
