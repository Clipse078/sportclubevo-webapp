import {
  FEASIBILITY_COMPLETE_SEARCH_MAX_FIXTURES,
  FEASIBILITY_COMPLETE_SEARCH_MAX_PITCHES,
} from "./constants";

/** Whether 01D complete backtracking proof is skipped (performance guard — not a product rule). */
export function exceedsCompleteFeasibilitySearchBounds(input: {
  readonly fixtures: readonly unknown[];
  readonly tournamentPitches: readonly unknown[];
}): boolean {
  return (
    input.fixtures.length > FEASIBILITY_COMPLETE_SEARCH_MAX_FIXTURES ||
    input.tournamentPitches.length > FEASIBILITY_COMPLETE_SEARCH_MAX_PITCHES
  );
}
