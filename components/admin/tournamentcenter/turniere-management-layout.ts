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
 * Tablet (md): context/status under identity; action stays top-right.
 * Desktop (xl+): single balanced row using full list width (PO laptop viewport).
 *
 * Note: workspace main+rail side-by-side still waits for min-[105rem]; row composition
 * activates earlier because the list column is already wide enough at xl.
 */
export const TURNIERE_ROW_DESKTOP_BREAKPOINT = "xl";

export const TURNIERE_ROW_INTERMEDIATE_GRID =
  "md:grid md:grid-cols-[4.75rem_minmax(0,1fr)_2.5rem] md:grid-rows-[auto_auto] md:items-start md:gap-x-4 md:gap-y-2";

export const TURNIERE_ROW_DESKTOP_GRID =
  "xl:grid-cols-[4.75rem_minmax(18rem,1fr)_minmax(15rem,22rem)_2.5rem] xl:grid-rows-1 xl:items-center xl:gap-y-0";

/** @deprecated alias — use TURNIERE_ROW_DESKTOP_GRID */
export const TURNIERE_ROW_WIDE_GRID = TURNIERE_ROW_DESKTOP_GRID;

export const TURNIERE_ROW_DATE_CELL = "md:row-span-2 xl:row-span-1";

export const TURNIERE_ROW_IDENTITY_CELL =
  "min-w-0 md:col-start-2 md:row-start-1 xl:col-start-2";

export const TURNIERE_ROW_CONTEXT_CELL =
  "min-w-0 md:col-span-2 md:col-start-2 md:row-start-2 xl:col-span-1 xl:col-start-3 xl:row-start-1";

export const TURNIERE_ROW_ACTION_CELL =
  "relative z-[2] flex justify-end md:col-start-3 md:row-start-1 xl:col-start-4";
