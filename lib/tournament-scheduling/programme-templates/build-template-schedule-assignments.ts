import type { FixedPauseWindow } from "./fixed-pause-round-scheduling";
import {
  computeRoundParallelScheduleWithBreaks,
  type RoundScheduledBreak,
} from "./round-scheduled-breaks";
/** Minimal fixture shape for round-parallel time assignment (no template slot mapping). */
export type TemplateScheduleAssignmentFixtureInput = {
  fixtureId: string;
  tournamentPitchId: string;
  roundIndex: number;
};

export type TemplateScheduleAssignment = {
  fixtureId: string;
  tournamentPitchId: string;
  startUtcMs: number;
  resourceEndUtcMs: number;
};

function legacyBreakAfterRoundNumbersToScheduledBreaks(input: {
  breakAfterRoundNumbers?: readonly number[];
  breakDurationMinutes?: number;
}): RoundScheduledBreak[] {
  const duration = input.breakDurationMinutes ?? 0;
  if (duration <= 0) return [];
  return (input.breakAfterRoundNumbers ?? []).map((afterRoundNumber) => ({
    afterRoundNumber,
    durationMinutes: duration,
  }));
}

/**
 * Deterministic round-parallel template scheduling — no combinatorial optimiser.
 * All matches in the same template round start together; rounds advance by slot duration.
 */
export function buildTemplateScheduleAssignments(input: {
  tournamentStartUtcMs: number;
  matchDurationMinutes: number;
  transitionMinutes: number;
  breakAfterRoundNumbers?: readonly number[];
  breakDurationMinutes?: number;
  roundBreaks?: readonly RoundScheduledBreak[];
  fixedPause?: FixedPauseWindow | null;
  fixtures: readonly TemplateScheduleAssignmentFixtureInput[];
}): TemplateScheduleAssignment[] {
  const maxRoundIndex = Math.max(...input.fixtures.map((f) => f.roundIndex), 0);
  const roundCount = maxRoundIndex + 1;

  const roundBreaks =
    input.roundBreaks ??
    legacyBreakAfterRoundNumbersToScheduledBreaks({
      breakAfterRoundNumbers: input.breakAfterRoundNumbers,
      breakDurationMinutes: input.breakDurationMinutes,
    });

  const timeline = computeRoundParallelScheduleWithBreaks({
    tournamentStartUtcMs: input.tournamentStartUtcMs,
    roundCount,
    matchDurationMinutes: input.matchDurationMinutes,
    transitionMinutes: input.transitionMinutes,
    fixedPause: input.fixedPause ?? null,
    roundBreaks: input.fixedPause ? [] : roundBreaks,
  });

  const roundStartMs = new Map(timeline.roundStartUtcMs.map((ms, index) => [index, ms]));

  return input.fixtures.map((fixture) => {
    const startUtcMs = roundStartMs.get(fixture.roundIndex) ?? input.tournamentStartUtcMs;
    const endUtcMs = startUtcMs + input.matchDurationMinutes * 60_000;
    return {
      fixtureId: fixture.fixtureId,
      tournamentPitchId: fixture.tournamentPitchId,
      startUtcMs,
      resourceEndUtcMs: endUtcMs,
    };
  });
}
