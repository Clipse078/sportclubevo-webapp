import {
  EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES,
  LEXICOGRAPHIC_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS,
  LEXICOGRAPHIC_COMPLETE_SEARCH_MAX_FIXTURES,
  LEXICOGRAPHIC_COMPLETE_SEARCH_MAX_PITCHES,
} from "./constants";

/**
 * Whether to run lexicographic complete optimisation (01F2) vs 01D witness + bounded improvement.
 *
 * {@link EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES} is the product-supported schedule size ceiling for
 * the optimiser path — not “always enumerate”. Enumeration is exponential in fixtures × slots;
 * seven or more fixtures on wide pitch grids use deterministic bounded improvement instead.
 */
export function shouldUseLexicographicCompleteSearch(params: {
  fixtureCount: number;
  pitchCount: number;
  candidateSlotCount: number;
}): boolean {
  const { fixtureCount, pitchCount, candidateSlotCount } = params;
  if (fixtureCount > EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES) {
    return false;
  }
  if (fixtureCount <= LEXICOGRAPHIC_COMPLETE_SEARCH_MAX_FIXTURES) {
    return true;
  }
  return (
    pitchCount <= LEXICOGRAPHIC_COMPLETE_SEARCH_MAX_PITCHES &&
    candidateSlotCount <= LEXICOGRAPHIC_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS
  );
}
