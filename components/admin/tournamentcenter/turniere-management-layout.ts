/**
 * TURNIERE-UX-01 — reuses SPIELE-UX-01C responsive composition contract.
 */

export {
  SPIELE_WORKSPACE_MAIN_RAIL_GRID as TURNIERE_WORKSPACE_MAIN_RAIL_GRID,
  SPIELE_WORKSPACE_RAIL_ASIDE as TURNIERE_WORKSPACE_RAIL_ASIDE,
  SPIELE_WORKSPACE_RAIL_STACK as TURNIERE_WORKSPACE_RAIL_STACK,
  SPIELE_WIDE_DESKTOP_BREAKPOINT as TURNIERE_WIDE_DESKTOP_BREAKPOINT,
} from "@/components/admin/matchcenter/spiele-management-layout";

/** Tournament row — constrained / laptop layout. */
export const TURNIERE_ROW_INTERMEDIATE_GRID =
  "md:grid md:grid-cols-[4.75rem_3.25rem_minmax(0,1fr)_2.5rem] md:grid-rows-[auto_auto] md:items-start md:gap-x-3 md:gap-y-2";

/** Tournament row — wide desktop horizontal layout. */
export const TURNIERE_ROW_WIDE_GRID =
  "min-[105rem]:grid-cols-[4.75rem_3.75rem_minmax(0,1.85fr)_minmax(0,9.5rem)_2.5rem] min-[105rem]:grid-rows-1 min-[105rem]:items-center min-[105rem]:gap-x-4 min-[105rem]:gap-y-0";
