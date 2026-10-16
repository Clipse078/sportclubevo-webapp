/** Canonical stage key for single-stage MVP round robin. */
export const TOURNAMENT_FIXTURE_STAGE_MAIN = "MAIN";

/**
 * Technical fixture-count safety bound for pure generation + persistence (not product cardinality).
 * Feasibility (01D) retains its own participant/fixture envelope.
 */
export const TOURNAMENT_ROUND_ROBIN_TECHNICAL_MAX_FIXTURES = 2_000;

/** Strategy-neutral fixture-count safety bound (same value as historical RR constant). */
export const TOURNAMENT_GENERATION_TECHNICAL_MAX_FIXTURES =
  TOURNAMENT_ROUND_ROBIN_TECHNICAL_MAX_FIXTURES;

/** Minimum entrants for a meaningful round robin. */
export const TOURNAMENT_ROUND_ROBIN_MIN_PARTICIPANTS = 2;

/** Default meetings per opponent when omitted (backward-compatible with 01C). */
export const TOURNAMENT_ROUND_ROBIN_DEFAULT_MEETINGS_PER_OPPONENT = 1;

/** Internal generation sentinel — never persisted. */
export const ROUND_ROBIN_BYE_SENTINEL = "__ROUND_ROBIN_BYE__";

export type TournamentFixtureFormatId = "ROUND_ROBIN";
