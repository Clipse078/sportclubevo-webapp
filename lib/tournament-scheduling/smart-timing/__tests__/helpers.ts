import type { TournamentTimingFixtureRef, TournamentTimingInput } from "../types";

export const BASE_MS = Date.UTC(2026, 6, 1, 10, 0, 0);

export function windowFromClock(startMinutes: number, endMinutes: number) {
  return {
    startUtcMs: BASE_MS + startMinutes * 60_000,
    endUtcMs: BASE_MS + endMinutes * 60_000,
  };
}

let pitchOrder = 0;
export function tournamentPitch(id: string, displayOrder?: number) {
  pitchOrder += 1;
  return {
    tournamentPitchId: id,
    displayOrder: displayOrder ?? pitchOrder,
    label: id,
  };
}

export function sequentialFixtures(
  count: number,
  participantPairs: [string, string][] | null = null,
): TournamentTimingFixtureRef[] {
  const fixtures: TournamentTimingFixtureRef[] = [];
  for (let i = 0; i < count; i += 1) {
    const uniquePair =
      count * 2 <= 16 ? [`p${i * 2 + 1}`, `p${i * 2 + 2}`] : null;
    const defaultA = `p${(i % 8) + 1}`;
    const defaultB = `p${((i + 1) % 8) + 1}`;
    const [a, b] =
      participantPairs?.[i] ??
      uniquePair ?? [defaultA, defaultB === defaultA ? `p${((i + 2) % 8) + 1}` : defaultB];
    fixtures.push({
      fixtureId: `f${i + 1}`,
      stageKey: "MAIN",
      roundIndex: i,
      slotIndexInRound: 0,
      sideAParticipantId: a,
      sideBParticipantId: b,
    });
  }
  return fixtures;
}

export function participantsFromFixtures(fixtures: TournamentTimingFixtureRef[]) {
  const ids = new Set<string>();
  for (const f of fixtures) {
    ids.add(f.sideAParticipantId);
    ids.add(f.sideBParticipantId);
  }
  return [...ids].map((participantId) => ({ participantId }));
}

export function baseInput(
  partial: Partial<TournamentTimingInput> & Pick<TournamentTimingInput, "mode" | "fixtures">,
): TournamentTimingInput {
  pitchOrder = 0;
  const participants =
    partial.participants ?? participantsFromFixtures(partial.fixtures);
  return {
    tournamentWindow: windowFromClock(0, 120),
    config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
    tournamentPitches: [tournamentPitch("pitch-a", 0)],
    breaks: [],
    endBoundaryKnown: true,
    ...partial,
    participants,
  };
}
