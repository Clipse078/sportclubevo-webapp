/** 01A MVP scheduling analysis limits (aligned with fixture generation). */
export const FEASIBILITY_MAX_PARTICIPANTS = 16;
export const FEASIBILITY_MAX_FIXTURES = 120;
export const FEASIBILITY_MAX_PITCHES = 8;
export const FEASIBILITY_MAX_CANDIDATE_SLOTS = 500;

/**
 * TIGHT when feasible and aggregate pitch-minute utilisation meets or exceeds this ratio.
 * Deterministic, documented — not aesthetic.
 */
export const TIGHT_CAPACITY_UTILISATION_THRESHOLD = 0.85;

/** Application-boundary defaults when schedule version fields are null (until Creator adoption). */
export const FEASIBILITY_DEFAULT_TRANSITION_MINUTES = 0;
export const FEASIBILITY_DEFAULT_MIN_REST_MINUTES = 0;
