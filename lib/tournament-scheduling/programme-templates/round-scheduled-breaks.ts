/**
 * Round-bound tournament breaks — structural position (after round N) with per-break duration.
 * Reuses the same slot-advance semantics as buildTemplateScheduleAssignments (TP01).
 */

import {
  advanceCursorPastPauseOverlap,
  type FixedPauseWindow,
} from "./fixed-pause-round-scheduling";

export type RoundScheduledBreak = {
  afterRoundNumber: number;
  durationMinutes: number;
};

export type ComputedRoundBreakWindow = RoundScheduledBreak & {
  startUtcMs: number;
  endUtcMs: number;
};

export function sortRoundScheduledBreaks(
  breaks: readonly RoundScheduledBreak[],
): RoundScheduledBreak[] {
  return [...breaks].sort(
    (a, b) => a.afterRoundNumber - b.afterRoundNumber || a.durationMinutes - b.durationMinutes,
  );
}

export function buildRoundBreakDurationMap(
  breaks: readonly RoundScheduledBreak[],
): Map<number, number> {
  const map = new Map<number, number>();
  for (const row of sortRoundScheduledBreaks(breaks)) {
    map.set(row.afterRoundNumber, row.durationMinutes);
  }
  return map;
}

export function computeRoundParallelScheduleWithBreaks(input: {
  tournamentStartUtcMs: number;
  roundCount: number;
  matchDurationMinutes: number;
  transitionMinutes: number;
  /** Legacy single wall-clock block — mutually exclusive with roundBreaks in composer UX. */
  fixedPause?: FixedPauseWindow | null;
  roundBreaks?: readonly RoundScheduledBreak[];
}): {
  roundStartUtcMs: readonly number[];
  programmeEndUtcMs: number;
  breakWindows: readonly ComputedRoundBreakWindow[];
} {
  if (input.roundCount < 1) {
    return {
      roundStartUtcMs: [],
      programmeEndUtcMs: input.tournamentStartUtcMs,
      breakWindows: [],
    };
  }

  const slotMs = (input.matchDurationMinutes + input.transitionMinutes) * 60_000;
  const fixedPause = input.fixedPause ?? null;
  const breakDurationByRound = buildRoundBreakDurationMap(input.roundBreaks ?? []);

  const roundStartUtcMs: number[] = [];
  const breakWindows: ComputedRoundBreakWindow[] = [];
  let cursor = input.tournamentStartUtcMs;

  for (let roundIndex = 0; roundIndex < input.roundCount; roundIndex += 1) {
    cursor = advanceCursorPastPauseOverlap({
      cursorUtcMs: cursor,
      matchDurationMinutes: input.matchDurationMinutes,
      pause: fixedPause,
    });
    roundStartUtcMs.push(cursor);
    cursor += slotMs;
    const roundNumber = roundIndex + 1;
    const durationMinutes = breakDurationByRound.get(roundNumber);
    if (durationMinutes != null && durationMinutes > 0 && !fixedPause) {
      const startUtcMs = cursor;
      const endUtcMs = startUtcMs + durationMinutes * 60_000;
      breakWindows.push({
        afterRoundNumber: roundNumber,
        durationMinutes,
        startUtcMs,
        endUtcMs,
      });
      cursor = endUtcMs;
    }
  }

  const lastStart = roundStartUtcMs[roundStartUtcMs.length - 1]!;
  const programmeEndUtcMs = lastStart + input.matchDurationMinutes * 60_000;
  return { roundStartUtcMs, programmeEndUtcMs, breakWindows };
}
