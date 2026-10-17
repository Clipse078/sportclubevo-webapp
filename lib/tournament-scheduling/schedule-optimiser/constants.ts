/**
 * Complete lexicographic enumeration is exponential in fixture count.
 * Within this node budget the optimiser may prove OPTIMAL; beyond it, a best-so-far
 * schedule is returned as FEASIBLE_NOT_PROVEN_OPTIMAL (01D witness fallback if needed).
 */
export const OPTIMISER_MAX_SEARCH_NODES = 750_000;

/** Full lexicographic enumeration is used at or below this fixture count (within 01D bounds). */
export const EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES = 6;
