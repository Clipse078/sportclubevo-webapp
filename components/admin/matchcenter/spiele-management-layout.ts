/**
 * SPIELE-UX-01C — responsive composition contract.
 *
 * Viewport breakpoints (not content-box width): the persistent SCE sidebar (~14rem)
 * and page padding (~3.5rem) leave too little room for a 17.5rem rail plus a
 * five-column match row at Tailwind `xl` (1280px). Side-by-side main+rail and
 * the target horizontal match row activate together at `min-[105rem]` (~1680px).
 */

/** Main list + right rail: stacked by default, side-by-side on wide desktop only. */
export const SPIELE_WORKSPACE_MAIN_RAIL_GRID =
  "grid gap-4 min-[105rem]:grid-cols-[minmax(0,1fr)_17.5rem]";

/** Right rail positioning when beside the main workspace. */
export const SPIELE_WORKSPACE_RAIL_ASIDE =
  "min-w-0 min-[105rem]:sticky min-[105rem]:top-4 min-[105rem]:self-start";

/**
 * When the rail stacks under the workspace, compose calendar + filters without
 * three full-width towers.
 */
export const SPIELE_WORKSPACE_RAIL_STACK =
  "grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] min-[105rem]:flex min-[105rem]:flex-col min-[105rem]:gap-3";

/** Spielplanung match row — laptop / constrained desktop (stacked operational row). */
export const SPIELE_MATCH_ROW_INTERMEDIATE_GRID =
  "md:grid md:grid-cols-[4.75rem_minmax(0,1fr)_2.5rem] md:grid-rows-[auto_auto] md:items-start md:gap-x-4 md:gap-y-2";

/** Spielplanung match row — wide desktop target horizontal grid. */
export const SPIELE_MATCH_ROW_WIDE_GRID =
  "min-[105rem]:grid-cols-[4.75rem_minmax(0,1.85fr)_minmax(0,9.5rem)_minmax(0,1.15fr)_2.5rem] min-[105rem]:grid-rows-1 min-[105rem]:items-center min-[105rem]:gap-y-0";

/** Resultate list header + rows — align wide columns with match rows. */
export const SPIELE_RESULT_LIST_WIDE_GRID =
  "min-[105rem]:grid-cols-[minmax(5.5rem,0.55fr)_minmax(0,1.85fr)_minmax(0,1fr)_minmax(5.75rem,0.85fr)_3rem]";

export const SPIELE_RESULT_LIST_INTERMEDIATE_GRID =
  "md:grid md:grid-cols-[minmax(5.5rem,0.55fr)_minmax(0,1fr)_3rem] md:grid-rows-[auto_auto] md:items-start md:gap-x-4 md:gap-y-2";

export const SPIELE_WIDE_DESKTOP_BREAKPOINT = "min-[105rem]";
