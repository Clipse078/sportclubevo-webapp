/**
 * Deterministic single round-robin fixture generation (circle method).
 * FIXTURE_SIDE_SEMANTICS = NEUTRAL_A_B — lower participant id is side A.
 */

import {
  ROUND_ROBIN_BYE_SENTINEL,
  TOURNAMENT_FIXTURE_STAGE_MAIN,
  TOURNAMENT_ROUND_ROBIN_MAX_PARTICIPANTS,
  TOURNAMENT_ROUND_ROBIN_MIN_PARTICIPANTS,
} from "./constants";
import type { RoundRobinGenerationInput, TournamentFixtureGenerationDefinition } from "./types";
import { assertDistinctParticipantIds, compareParticipantId } from "./ordering";
import { RoundRobinGenerationValidationError } from "./errors";

export { RoundRobinGenerationValidationError } from "./errors";

function assignNeutralSides(
  participantA: string,
  participantB: string,
): { sideAParticipantId: string; sideBParticipantId: string } {
  if (compareParticipantId(participantA, participantB) <= 0) {
    return { sideAParticipantId: participantA, sideBParticipantId: participantB };
  }
  return { sideAParticipantId: participantB, sideBParticipantId: participantA };
}

function buildGeneratorKey(
  stageKey: string,
  roundIndex: number,
  slotIndexInRound: number,
): string {
  return `round-robin:${stageKey}:${roundIndex}:${slotIndexInRound}`;
}

/**
 * Pure circle-method single round robin. BYE sentinel is used only for odd counts.
 */
export function generateRoundRobinFixtures(
  input: RoundRobinGenerationInput,
): TournamentFixtureGenerationDefinition[] {
  const stageKey = input.config?.stageKey ?? TOURNAMENT_FIXTURE_STAGE_MAIN;
  if (input.config?.format && input.config.format !== "ROUND_ROBIN") {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_FORMAT_UNSUPPORTED",
      `Unsupported format: ${String(input.config.format)}`,
    );
  }

  const participantIds = [...input.participantIds];
  assertDistinctParticipantIds(participantIds);

  const n = participantIds.length;
  if (n < TOURNAMENT_ROUND_ROBIN_MIN_PARTICIPANTS) {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_PARTICIPANTS_INSUFFICIENT",
      `Round robin requires at least ${TOURNAMENT_ROUND_ROBIN_MIN_PARTICIPANTS} participants`,
    );
  }
  if (n > TOURNAMENT_ROUND_ROBIN_MAX_PARTICIPANTS) {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_PARTICIPANT_LIMIT_EXCEEDED",
      `Round robin supports at most ${TOURNAMENT_ROUND_ROBIN_MAX_PARTICIPANTS} participants`,
    );
  }

  const slots: string[] = [...participantIds];
  if (slots.length % 2 === 1) {
    slots.push(ROUND_ROBIN_BYE_SENTINEL);
  }

  const paddedCount = slots.length;
  const roundCount = paddedCount - 1;
  const pairingsPerRound = paddedCount / 2;
  const fixtures: TournamentFixtureGenerationDefinition[] = [];

  let working = [...slots];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    let slotIndexInRound = 0;
    for (let pair = 0; pair < pairingsPerRound; pair += 1) {
      const left = working[pair];
      const right = working[paddedCount - 1 - pair];
      if (left === ROUND_ROBIN_BYE_SENTINEL || right === ROUND_ROBIN_BYE_SENTINEL) {
        continue;
      }
      const sides = assignNeutralSides(left, right);
      fixtures.push({
        stageKey,
        roundIndex,
        slotIndexInRound,
        ...sides,
        generatorKey: buildGeneratorKey(stageKey, roundIndex, slotIndexInRound),
      });
      slotIndexInRound += 1;
    }

    const fixed = working[0];
    const rotating = working.slice(1);
    const last = rotating.pop();
    if (last === undefined) {
      throw new RoundRobinGenerationValidationError(
        "TOURNAMENT_GENERATION_INVALID",
        "Round-robin rotation produced an empty tail",
      );
    }
    rotating.unshift(last);
    working = [fixed, ...rotating];
  }

  return fixtures;
}

/** Expected fixture count for single round robin. */
export function expectedRoundRobinFixtureCount(participantCount: number): number {
  return (participantCount * (participantCount - 1)) / 2;
}

/** Expected round count (real rounds played). */
export function expectedRoundRobinRoundCount(participantCount: number): number {
  if (participantCount % 2 === 0) {
    return participantCount - 1;
  }
  return participantCount;
}
