import type { TournamentFixtureGenerationDefinition } from "./types";
import {
  expectedRoundRobinFixtureCount,
  expectedRoundRobinGlobalRoundCount,
  expectedRoundRobinRoundCount,
} from "./round-robin";
import { TOURNAMENT_ROUND_ROBIN_DEFAULT_MEETINGS_PER_OPPONENT } from "./constants";

import { compareParticipantId } from "./ordering";

function unorderedPairKey(a: string, b: string): string {
  return compareParticipantId(a, b) <= 0 ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Validates round-robin structural invariants for test and debug use.
 */
export function validateRoundRobinInvariants(
  participantIds: readonly string[],
  fixtures: readonly TournamentFixtureGenerationDefinition[],
  options: { meetingsPerOpponent?: number } = {},
): void {
  const meetingsPerOpponent =
    options.meetingsPerOpponent ?? TOURNAMENT_ROUND_ROBIN_DEFAULT_MEETINGS_PER_OPPONENT;
  const n = participantIds.length;
  const expectedFixtures = expectedRoundRobinFixtureCount(n, meetingsPerOpponent);
  if (fixtures.length !== expectedFixtures) {
    throw new Error(
      `Expected ${expectedFixtures} fixtures for ${n} participants × ${meetingsPerOpponent} meetings, got ${fixtures.length}`,
    );
  }

  const pairCounts = new Map<string, number>();
  for (const fixture of fixtures) {
    if (fixture.sideAParticipantId === fixture.sideBParticipantId) {
      throw new Error("Self-play fixture detected");
    }
    const key = unorderedPairKey(fixture.sideAParticipantId, fixture.sideBParticipantId);
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const key = unorderedPairKey(participantIds[i], participantIds[j]);
      if (pairCounts.get(key) !== meetingsPerOpponent) {
        throw new Error(`Pair ${key} must appear exactly ${meetingsPerOpponent} times`);
      }
    }
  }

  const roundsPerCycle = expectedRoundRobinRoundCount(n);
  const totalRounds = expectedRoundRobinGlobalRoundCount(n, meetingsPerOpponent);
  const byRound = new Map<number, TournamentFixtureGenerationDefinition[]>();
  for (const fixture of fixtures) {
    const list = byRound.get(fixture.roundIndex) ?? [];
    list.push(fixture);
    byRound.set(fixture.roundIndex, list);
  }

  if (byRound.size !== totalRounds) {
    throw new Error(`Expected ${totalRounds} global rounds, got ${byRound.size}`);
  }

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const roundFixtures = byRound.get(roundIndex) ?? [];
    const appearances = new Map<string, number>();
    for (const fixture of roundFixtures) {
      for (const id of [fixture.sideAParticipantId, fixture.sideBParticipantId]) {
        appearances.set(id, (appearances.get(id) ?? 0) + 1);
      }
    }

    const roundInCycle = roundIndex % roundsPerCycle;

    if (n % 2 === 0) {
      for (const id of participantIds) {
        if (appearances.get(id) !== 1) {
          throw new Error(`Participant ${id} must appear once in even round ${roundInCycle}`);
        }
      }
    } else {
      let byeCount = 0;
      for (const id of participantIds) {
        const count = appearances.get(id) ?? 0;
        if (count === 0) {
          byeCount += 1;
        } else if (count !== 1) {
          throw new Error(`Participant ${id} appears ${count} times in round ${roundInCycle}`);
        }
      }
      if (byeCount !== 1) {
        throw new Error(`Round ${roundInCycle} must have exactly one bye for odd N`);
      }
    }
  }
}
