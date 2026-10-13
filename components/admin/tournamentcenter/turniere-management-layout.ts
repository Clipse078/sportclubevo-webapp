/**
 * TURNIERE-UX-01 — reuses SPIELE-UX-01C responsive composition contract.
 */

export {
  SPIELE_WORKSPACE_MAIN_RAIL_GRID as TURNIERE_WORKSPACE_MAIN_RAIL_GRID,
  SPIELE_WORKSPACE_RAIL_ASIDE as TURNIERE_WORKSPACE_RAIL_ASIDE,
  SPIELE_WORKSPACE_RAIL_STACK as TURNIERE_WORKSPACE_RAIL_STACK,
  SPIELE_WIDE_DESKTOP_BREAKPOINT as TURNIERE_WIDE_DESKTOP_BREAKPOINT,
} from "@/components/admin/matchcenter/spiele-management-layout";

/**
 * Tournament list row — date | identity | context/status | action.
 * Intermediate: context/status wraps under identity; wide desktop: single balanced row.
 */
export const TURNIERE_ROW_INTERMEDIATE_GRID =
  "md:grid md:grid-cols-[4.75rem_minmax(0,1fr)_minmax(14rem,auto)_2.5rem] md:grid-rows-[auto_auto] md:items-start md:gap-x-4 md:gap-y-2";

export const TURNIERE_ROW_WIDE_GRID =
  "min-[105rem]:grid-rows-1 min-[105rem]:items-center min-[105rem]:gap-y-0";

export const TURNIERE_ROW_DATE_CELL = "md:row-span-2 min-[105rem]:row-span-1";

export const TURNIERE_ROW_IDENTITY_CELL =
  "min-w-0 md:col-start-2 md:row-start-1 min-[105rem]:col-start-2";

export const TURNIERE_ROW_CONTEXT_CELL =
  "min-w-0 md:col-span-2 md:col-start-2 md:row-start-2 min-[105rem]:col-span-1 min-[105rem]:col-start-3 min-[105rem]:row-start-1";

export const TURNIERE_ROW_ACTION_CELL =
  "flex justify-end md:col-start-4 md:row-start-1 min-[105rem]:col-start-4";
