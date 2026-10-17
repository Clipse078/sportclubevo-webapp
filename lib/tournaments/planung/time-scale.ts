/**
 * Derive Planung board time rows from assignments, breaks, and scheduling config.
 */

import type { TournamentPlanungTimeScale } from "./types";

export function buildPlanungTimeScale(input: {
  windowStartUtc: string;
  windowEndUtc: string;
  matchDurationMinutes: number;
  transitionMinutes: number;
  assignmentStartUtc: readonly string[];
  breakStartUtc: readonly string[];
}): TournamentPlanungTimeScale {
  const anchors = new Set<string>([
    ...input.assignmentStartUtc,
    ...input.breakStartUtc,
    input.windowStartUtc,
  ]);
  const rowAnchorsUtc = [...anchors]
    .filter((iso) => {
      const t = Date.parse(iso);
      const start = Date.parse(input.windowStartUtc);
      const end = Date.parse(input.windowEndUtc);
      return t >= start && t <= end;
    })
    .sort((a, b) => Date.parse(a) - Date.parse(b));

  return {
    rowAnchorsUtc,
    matchDurationMinutes: input.matchDurationMinutes,
    transitionMinutes: input.transitionMinutes,
    windowStartUtc: input.windowStartUtc,
    windowEndUtc: input.windowEndUtc,
  };
}

/** Row index for a start instant on the derived anchor grid (fallback: append). */
export function resolveTimeRowIndex(
  timeScale: TournamentPlanungTimeScale,
  startUtc: string,
): number {
  const target = Date.parse(startUtc);
  const idx = timeScale.rowAnchorsUtc.findIndex((iso) => Date.parse(iso) === target);
  if (idx >= 0) return idx;
  const insertAt = timeScale.rowAnchorsUtc.findIndex((iso) => Date.parse(iso) > target);
  return insertAt >= 0 ? insertAt : timeScale.rowAnchorsUtc.length;
}
