/**
 * SCE-OPS-01 — derived operational completeness for matches (no persisted flags).
 *
 * Extensible for future planning-quality checks; only end-time action is
 * implemented in this ticket.
 */

import { isMeaningfulEventInterval } from "@/lib/facilities/resource-occupancy-window";

export const MATCH_END_TIME_ACTION_KEY = "end-time" as const;
export const MATCH_END_TIME_ACTION_LABEL = "Endzeit setzen" as const;
export const MATCH_END_TIME_MISSING_HEADLINE = "Endzeit fehlt" as const;
export const MATCH_END_TIME_MISSING_COPY =
  "Für dieses Spiel ist noch keine gültige Endzeit hinterlegt." as const;

export type MatchTimingFields = {
  startAt: Date | string;
  endAt?: Date | string | null;
};

export type MatchOperationalCompleteness = {
  requiresEndTime: boolean;
};

/** Legacy planner edit — canonical place to set Event.startAt/endAt for matches. */
export function getMatchEndTimeCorrectionHref(matchId: string): string {
  return `/dashboard/planner/edit/${encodeURIComponent(matchId.trim())}`;
}

/**
 * TRUE when canonical end time is missing/null/empty OR not meaningfully after start.
 * Overnight intervals (end on a later calendar instant) are valid when end > start.
 */
export function matchRequiresEndTimeAction(match: MatchTimingFields): boolean {
  const startAt = match.startAt;
  const endAt = match.endAt;

  if (endAt === null || endAt === undefined) {
    return true;
  }

  if (typeof endAt === "string" && endAt.trim() === "") {
    return true;
  }

  return !isMeaningfulEventInterval(startAt, endAt);
}

export function getMatchOperationalCompleteness(
  match: MatchTimingFields,
): MatchOperationalCompleteness {
  return {
    requiresEndTime: matchRequiresEndTimeAction(match),
  };
}
