import {
  computeRoundParallelScheduleTimeline,
  type FixedPauseWindow,
} from "./fixed-pause-round-scheduling";
import type { InstantiatedTemplateFixturePlan } from "./types";

export type TemplateScheduleAssignment = {
  fixtureId: string;
  tournamentPitchId: string;
  startUtcMs: number;
  resourceEndUtcMs: number;
};

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
  fixedPause?: FixedPauseWindow | null;
  fixtures: readonly (InstantiatedTemplateFixturePlan & { fixtureId: string; tournamentPitchId: string })[];
}): TemplateScheduleAssignment[] {
  const maxRoundIndex = Math.max(...input.fixtures.map((f) => f.roundIndex), 0);
  const roundCount = maxRoundIndex + 1;

  let roundStartMs: Map<number, number>;
  if (input.fixedPause) {
    const timeline = computeRoundParallelScheduleTimeline({
      tournamentStartUtcMs: input.tournamentStartUtcMs,
      roundCount,
      matchDurationMinutes: input.matchDurationMinutes,
      transitionMinutes: input.transitionMinutes,
      fixedPause: input.fixedPause,
    });
    roundStartMs = new Map(timeline.roundStartUtcMs.map((ms, index) => [index, ms]));
  } else {
    const slotMs = (input.matchDurationMinutes + input.transitionMinutes) * 60_000;
    const breakMs = (input.breakDurationMinutes ?? 0) * 60_000;
    const breakSet = new Set(input.breakAfterRoundNumbers ?? []);
    roundStartMs = new Map<number, number>();
    let cursor = input.tournamentStartUtcMs;
    for (let roundIndex = 0; roundIndex <= maxRoundIndex; roundIndex += 1) {
      roundStartMs.set(roundIndex, cursor);
      cursor += slotMs;
      const roundNumber = roundIndex + 1;
      if (breakSet.has(roundNumber)) {
        cursor += breakMs;
      }
    }
  }

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
