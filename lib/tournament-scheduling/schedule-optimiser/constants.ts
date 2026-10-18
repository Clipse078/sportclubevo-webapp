/**
 * Complete lexicographic enumeration is exponential in fixture count.
 * Within this node budget the optimiser may prove OPTIMAL; beyond it, a best-so-far
 * schedule is returned as FEASIBLE_NOT_PROVEN_OPTIMAL (01D witness fallback if needed).
 */
export const OPTIMISER_MAX_SEARCH_NODES = 750_000;

/**
 * Maximum fixture count handled on the optimiser’s complete-search / bounded-improvement path
 * (within 01D candidate-slot guards). Above this, callers should not expect optimiser progress.
 */
export const EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES = 12;

/** Up to this fixture count, lex complete search is always attempted (within 01D slot cap). */
export const LEXICOGRAPHIC_COMPLETE_SEARCH_MAX_FIXTURES = 6;

/**
 * For 7…{@link EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES} fixtures, lex enumeration only when the
 * discrete grid stays narrow (low parallel width).
 */
export const LEXICOGRAPHIC_COMPLETE_SEARCH_MAX_PITCHES = 2;
export const LEXICOGRAPHIC_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS = 24;

/** Deterministic hill-climb passes for large schedules (fixture count above exhaustive threshold). */
export const BOUNDED_IMPROVEMENT_MAX_PASSES = 12;

/** Cap on alternative-slot evaluations during bounded improvement (deterministic, not wall-clock). */
export const BOUNDED_IMPROVEMENT_MAX_CANDIDATE_EVALUATIONS = 80_000;
