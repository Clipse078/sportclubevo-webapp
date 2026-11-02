/**
 * SCE Infoboard V2 R11R4 / R11R5 — venue KABINE secondary association labels.
 *
 * MATCH HEIM / GAST and tournament Kabine team association share this B-tier token.
 * Room number stays primary; association labels are secondary but distance-readable.
 */

export const MATCH_KABINE_ROLE_FONT_SIZE_VAR = "--ib-fs-match-role" as const;

/** Semantic alias — tournament Kabine team lines consume the same token as match roles. */
export const VENUE_KABINE_SECONDARY_ASSOCIATION_FONT_SIZE_VAR =
  MATCH_KABINE_ROLE_FONT_SIZE_VAR;

export const MATCH_KABINE_ROLE_COLOR_VAR = "--ib-match-kabine-role-color" as const;

/** R11R3 dark / physical-TV container baseline — regression comparison only. */
export const MATCH_KABINE_ROLE_FONT_SIZE_R11R3_DARK =
  "clamp(0.62rem, 0.75vw, 0.88rem)" as const;

/** R11R3 light theme baseline — regression comparison only. */
export const MATCH_KABINE_ROLE_FONT_SIZE_R11R3_LIGHT =
  "clamp(0.9375rem, 1.05vw, 1.0625rem)" as const;

/** R11R4 canonical dark theme + container-query baseline. */
export const MATCH_KABINE_ROLE_FONT_SIZE_DARK =
  "clamp(0.88rem, 1.08vw, 1.25rem)" as const;

/** R11R4 canonical light theme. */
export const MATCH_KABINE_ROLE_FONT_SIZE_LIGHT =
  "clamp(1.3rem, 1.48vw, 1.55rem)" as const;

/** Spacious single-activity card bump — still subordinate to room badge. */
export const MATCH_KABINE_ROLE_FONT_SIZE_SPACIOUS_SINGLE =
  "clamp(1.02rem, 1.28vw, 1.48rem)" as const;

export const MATCH_KABINE_ROLE_FONT_WEIGHT = 600 as const;

/** Tournament Kabine team association — same weight tier as HEIM / GAST. */
export const VENUE_KABINE_SECONDARY_ASSOCIATION_FONT_WEIGHT =
  MATCH_KABINE_ROLE_FONT_WEIGHT;

export const VENUE_KABINE_SECONDARY_ASSOCIATION_COLOR_VAR =
  MATCH_KABINE_ROLE_COLOR_VAR;

export const MATCH_KABINE_ROLE_USES_TEAM_NAMES = false as const;

export const TOURNAMENT_KABINE_USES_SECONDARY_ASSOCIATION_TIER = true as const;
