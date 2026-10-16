/**
 * Practical whole-minute increments for backward timing recommendations (01F1).
 * Football-friendly; not age-category specific.
 */
export const PRACTICAL_MATCH_DURATION_MINUTES = [
  5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 25, 30, 35, 40, 45,
] as const;

export const PRACTICAL_TRANSITION_MINUTES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15] as const;

/** Forward horizon when tournament end is open — large enough for interactive recalculation. */
export const FORWARD_OPEN_END_HORIZON_MINUTES = 24 * 60;

/** Reserve above this triggers positive RESERVE_REMAINS nudge (minutes). */
export const POSITIVE_RESERVE_NUDGE_THRESHOLD_MINUTES = 5;

/** Minimum suggested break opportunity duration (minutes). */
export const MIN_BREAK_OPPORTUNITY_MINUTES = 10;
