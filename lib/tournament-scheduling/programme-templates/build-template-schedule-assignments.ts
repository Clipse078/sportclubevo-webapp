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
  breakAfterRoundNumbers: readonly number[];
  breakDurationMinutes: number;
  fixtures: readonly (InstantiatedTemplateFixturePlan & { fixtureId: string; tournamentPitchId: string })[];
}): TemplateScheduleAssignment[] {
  const slotMs =
    (input.matchDurationMinutes + input.transitionMinutes) * 60_000;
  const breakMs = input.breakDurationMinutes * 60_000;
  const breakSet = new Set(input.breakAfterRoundNumbers);

  const maxRoundIndex = Math.max(...input.fixtures.map((f) => f.roundIndex), 0);
  const roundStartMs = new Map<number, number>();
  let cursor = input.tournamentStartUtcMs;
  for (let roundIndex = 0; roundIndex <= maxRoundIndex; roundIndex += 1) {
    roundStartMs.set(roundIndex, cursor);
    cursor += slotMs;
    const roundNumber = roundIndex + 1;
    if (breakSet.has(roundNumber)) {
      cursor += breakMs;
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
