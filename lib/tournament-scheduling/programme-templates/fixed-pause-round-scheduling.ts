/**
 * Deterministic round-parallel scheduling with an optional fixed wall-clock pause block.
 * No fixture may overlap the pause; rounds that would overlap resume after the pause ends.
 */

export type FixedPauseWindow = {
  startUtcMs: number;
  endUtcMs: number;
};

export function roundPlayingOverlapsPause(input: {
  roundStartUtcMs: number;
  matchDurationMinutes: number;
  pause: FixedPauseWindow;
}): boolean {
  const playEndMs = input.roundStartUtcMs + input.matchDurationMinutes * 60_000;
  return (
    input.roundStartUtcMs < input.pause.endUtcMs && playEndMs > input.pause.startUtcMs
  );
}

export function advanceCursorPastPauseOverlap(input: {
  cursorUtcMs: number;
  matchDurationMinutes: number;
  pause: FixedPauseWindow | null;
}): number {
  if (!input.pause) {
    return input.cursorUtcMs;
  }
  let cursor = input.cursorUtcMs;
  while (
    roundPlayingOverlapsPause({
      roundStartUtcMs: cursor,
      matchDurationMinutes: input.matchDurationMinutes,
      pause: input.pause,
    })
  ) {
    cursor = input.pause.endUtcMs;
  }
  return cursor;
}

export function computeRoundParallelScheduleTimeline(input: {
  tournamentStartUtcMs: number;
  roundCount: number;
  matchDurationMinutes: number;
  transitionMinutes: number;
  fixedPause: FixedPauseWindow | null;
}): { roundStartUtcMs: readonly number[]; programmeEndUtcMs: number } {
  if (input.roundCount < 1) {
    return { roundStartUtcMs: [], programmeEndUtcMs: input.tournamentStartUtcMs };
  }
  const slotMs = (input.matchDurationMinutes + input.transitionMinutes) * 60_000;
  const roundStartUtcMs: number[] = [];
  let cursor = input.tournamentStartUtcMs;
  for (let roundIndex = 0; roundIndex < input.roundCount; roundIndex += 1) {
    cursor = advanceCursorPastPauseOverlap({
      cursorUtcMs: cursor,
      matchDurationMinutes: input.matchDurationMinutes,
      pause: input.fixedPause,
    });
    roundStartUtcMs.push(cursor);
    cursor += slotMs;
  }
  const lastStart = roundStartUtcMs[roundStartUtcMs.length - 1]!;
  const programmeEndUtcMs = lastStart + input.matchDurationMinutes * 60_000;
  return { roundStartUtcMs, programmeEndUtcMs };
}

export function computeProgrammeRequiredMinutesFromTimeline(input: {
  tournamentStartUtcMs: number;
  programmeEndUtcMs: number;
}): number {
  return Math.max(
    0,
    Math.round((input.programmeEndUtcMs - input.tournamentStartUtcMs) / 60_000),
  );
}
