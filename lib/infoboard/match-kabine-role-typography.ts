/**
 * SCE Infoboard V2 R11R4 — match KABINE HEIM / GAST operational role labels.
 *
 * Room number stays primary; role labels are secondary but distance-readable.
 * Team names are not duplicated into this column.
 */

export const MATCH_KABINE_ROLE_FONT_SIZE_VAR = "--ib-fs-match-role" as const;

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

export const MATCH_KABINE_ROLE_USES_TEAM_NAMES = false as const;
