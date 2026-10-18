/**
 * Tournament scheduling engine guards (01M requalification).
 *
 * These limits are **not** product maximums for participants or tournament size.
 * Product rule: PARTICIPANT_PRODUCT_CARDINALITY = 2:n (no arbitrary team cap).
 *
 * Classifications:
 * - FEASIBILITY_COMPLETE_SEARCH_* — ALGORITHM_THRESHOLD / PERFORMANCE_GUARD for 01D complete proof
 * - SMART_TIMING_* — PERFORMANCE_GUARD for interactive Smart Timing heuristics
 * - TOURNAMENT_* technical fixture caps live in fixtures/constants.ts
 */

/** Complete backtracking feasibility search (01D) — above this, structural checks only → UNRESOLVED. */
export const FEASIBILITY_COMPLETE_SEARCH_MAX_FIXTURES = 120;

/** Complete-search pitch dimension guard (slot grid growth). */
export const FEASIBILITY_COMPLETE_SEARCH_MAX_PITCHES = 32;

/** Candidate-slot grid cap before complete search (H9 performance guard). */
export const FEASIBILITY_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS = 500;

/** @deprecated Alias — use FEASIBILITY_COMPLETE_SEARCH_MAX_FIXTURES */
export const FEASIBILITY_MAX_FIXTURES = FEASIBILITY_COMPLETE_SEARCH_MAX_FIXTURES;

/** @deprecated Alias — use FEASIBILITY_COMPLETE_SEARCH_MAX_PITCHES */
export const FEASIBILITY_MAX_PITCHES = FEASIBILITY_COMPLETE_SEARCH_MAX_PITCHES;

/** @deprecated Alias — use FEASIBILITY_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS */
export const FEASIBILITY_MAX_CANDIDATE_SLOTS = FEASIBILITY_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS;

/**
 * @deprecated Participant count is not a scheduling feasibility dimension (removed 01M).
 * Kept only so stale imports fail visibly in review; do not compare against it.
 */
export const FEASIBILITY_MAX_PARTICIPANTS = Number.MAX_SAFE_INTEGER;

/** Smart Timing pitch-count binary search upper bound (interactive proof only). */
export const SMART_TIMING_PITCH_PROOF_SEARCH_MAX = 32;

/** Skip heavy Smart Timing opportunity scans above this fixture count (deterministic fallback). */
export const SMART_TIMING_HEAVY_OPPORTUNITY_MAX_FIXTURES = 16;

/**
 * TIGHT when feasible and aggregate pitch-minute utilisation meets or exceeds this ratio.
 * Deterministic, documented — not aesthetic.
 */
export const TIGHT_CAPACITY_UTILISATION_THRESHOLD = 0.85;

/** Application-boundary defaults when schedule version fields are null (until Creator adoption). */
export const FEASIBILITY_DEFAULT_TRANSITION_MINUTES = 0;
export const FEASIBILITY_DEFAULT_MIN_REST_MINUTES = 0;
