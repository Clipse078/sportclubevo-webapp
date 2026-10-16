/** Canonical stage key for single-stage MVP round robin. */
export const TOURNAMENT_FIXTURE_STAGE_MAIN = "MAIN";

/** 01A MVP participant ceiling for single round robin. */
export const TOURNAMENT_ROUND_ROBIN_MAX_PARTICIPANTS = 16;

/** Minimum entrants for a meaningful round robin. */
export const TOURNAMENT_ROUND_ROBIN_MIN_PARTICIPANTS = 2;

/** Internal generation sentinel — never persisted. */
export const ROUND_ROBIN_BYE_SENTINEL = "__ROUND_ROBIN_BYE__";

export type TournamentFixtureFormatId = "ROUND_ROBIN";
