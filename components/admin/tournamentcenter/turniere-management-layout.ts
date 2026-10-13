/**
 * TURNIERE-UX-01 — reuses SPIELE-UX-01C responsive composition contract for workspace rail.
 */

export {
  SPIELE_WORKSPACE_MAIN_RAIL_GRID as TURNIERE_WORKSPACE_MAIN_RAIL_GRID,
  SPIELE_WORKSPACE_RAIL_ASIDE as TURNIERE_WORKSPACE_RAIL_ASIDE,
  SPIELE_WORKSPACE_RAIL_STACK as TURNIERE_WORKSPACE_RAIL_STACK,
  SPIELE_WIDE_DESKTOP_BREAKPOINT as TURNIERE_WIDE_DESKTOP_BREAKPOINT,
} from "@/components/admin/matchcenter/spiele-management-layout";

/**
 * Tournament list row — date | identity | context/status | action.
 *
 * Tablet (md–lg): context/status under identity; action stays top-right.
 * Desktop (xl+): single balanced row using full list width (PO laptop viewport).
 *
 * Tablet placement uses `md:max-xl:` so row/column rules do not compete with xl
 * desktop placement (md-only overrides can survive if xl reset is missing from CSS).
 *
 * Note: workspace main+rail side-by-side still waits for min-[105rem]; row composition
 * activates earlier because the list column is already wide enough at xl.
 */
export const TURNIERE_ROW_DESKTOP_BREAKPOINT = "xl";

export const TURNIERE_ROW_INTERMEDIATE_GRID =
  "md:grid md:grid-cols-[4.75rem_minmax(0,1fr)_2.5rem] md:max-xl:grid-rows-[auto_auto] md:max-xl:items-start md:gap-x-4 md:max-xl:gap-y-2";

export const TURNIERE_ROW_DESKTOP_GRID =
  "xl:grid-cols-[4.75rem_minmax(18rem,1fr)_minmax(15rem,22rem)_2.5rem] xl:grid-rows-1 xl:items-start xl:gap-x-5 xl:gap-y-0";

/** @deprecated alias — use TURNIERE_ROW_DESKTOP_GRID */
export const TURNIERE_ROW_WIDE_GRID = TURNIERE_ROW_DESKTOP_GRID;

export const TURNIERE_ROW_DATE_CELL =
  "md:max-xl:row-span-2 xl:col-start-1 xl:row-start-1 xl:row-span-1 xl:self-start";

export const TURNIERE_ROW_IDENTITY_CELL =
  "min-w-0 md:max-xl:col-start-2 md:max-xl:row-start-1 xl:col-start-2 xl:row-start-1 xl:col-span-1 xl:self-start";

export const TURNIERE_ROW_CONTEXT_CELL =
  "min-w-0 md:max-xl:col-span-2 md:max-xl:col-start-2 md:max-xl:row-start-2 xl:col-span-1 xl:col-start-3 xl:row-start-1 xl:self-start";

export const TURNIERE_ROW_ACTION_CELL =
  "relative z-[2] flex justify-end md:max-xl:col-start-3 md:max-xl:row-start-1 xl:col-start-4 xl:row-start-1 xl:self-start";
