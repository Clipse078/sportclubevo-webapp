/**
 * Lexicographic soft optimisation objectives for the future schedule optimiser (01F2).
 * Hard constraints (01D catalogue) always dominate — no weighted opaque score.
 */
export const SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER = [
  "SATISFY_ALL_HARD_CONSTRAINTS",
  "IMPROVE_PARTICIPANT_REST_FAIRNESS",
  "REDUCE_EXTREME_IDLE_GAPS",
  "DISTRIBUTE_PITCH_USAGE",
  "REDUCE_UNNECESSARY_PITCH_SWITCHES",
  "DISTRIBUTE_FIRST_AND_LAST_SLOTS_FAIRLY",
  "MINIMIZE_TOURNAMENT_SPAN",
] as const;

export type ScheduleSoftObjectiveId = (typeof SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER)[number];

export function compareLexicographicSoftObjectives(
  a: Partial<Record<ScheduleSoftObjectiveId, number>>,
  b: Partial<Record<ScheduleSoftObjectiveId, number>>,
): number {
  for (const key of SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER) {
    if (key === "SATISFY_ALL_HARD_CONSTRAINTS") continue;
    const av = a[key as ScheduleSoftObjectiveId] ?? 0;
    const bv = b[key as ScheduleSoftObjectiveId] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}
