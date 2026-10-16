/**
 * Deterministic round-robin fixture generation (circle method).
 * Supports repeated cycles (meetingsPerOpponent) and optional fixture Home/Away semantics.
 */

import {
  ROUND_ROBIN_BYE_SENTINEL,
  TOURNAMENT_FIXTURE_STAGE_MAIN,
  TOURNAMENT_ROUND_ROBIN_DEFAULT_MEETINGS_PER_OPPONENT,
  TOURNAMENT_ROUND_ROBIN_MIN_PARTICIPANTS,
  TOURNAMENT_ROUND_ROBIN_TECHNICAL_MAX_FIXTURES,
} from "./constants";
import type { RoundRobinGenerationInput, TournamentFixtureGenerationDefinition } from "./types";
import { assertDistinctParticipantIds, compareParticipantId } from "./ordering";
import { RoundRobinGenerationValidationError } from "./errors";
import type { HomeAwayRelevance } from "../smart-generator-architecture";
import { HOME_AWAY_DEFAULT_FOR_NEUTRAL_YOUTH_TOURNAMENT } from "../smart-generator-architecture";

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

function assignFixtureSides(
  participantA: string,
  participantB: string,
  cycleIndex: number,
  homeAwayRelevance: HomeAwayRelevance,
): { sideAParticipantId: string; sideBParticipantId: string } {
  const neutral = assignNeutralSides(participantA, participantB);
  if (homeAwayRelevance === "OFF") {
    return neutral;
  }
  if (cycleIndex % 2 === 0) {
    return neutral;
  }
  return {
    sideAParticipantId: neutral.sideBParticipantId,
    sideBParticipantId: neutral.sideAParticipantId,
  };
}

export function buildRoundRobinGeneratorKey(
  stageKey: string,
  cycleIndex: number,
  roundIndexInCycle: number,
  slotIndexInRound: number,
  groupScope?: string,
): string {
  const groupSegment = groupScope ? `:group:${groupScope}` : "";
  return `round-robin:${stageKey}${groupSegment}:${cycleIndex}:${roundIndexInCycle}:${slotIndexInRound}`;
}

function validateMeetingsPerOpponent(meetingsPerOpponent: number): void {
  if (!Number.isInteger(meetingsPerOpponent) || meetingsPerOpponent < 1) {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_MEETINGS_PER_OPPONENT_INVALID",
      "meetingsPerOpponent must be a positive integer",
    );
  }
}

function generateSingleCycleFixtures(input: {
  participantIds: readonly string[];
  stageKey: string;
  generatorKeyGroupScope?: string;
  cycleIndex: number;
  globalRoundOffset: number;
  homeAwayRelevance: HomeAwayRelevance;
}): TournamentFixtureGenerationDefinition[] {
  const {
    participantIds,
    stageKey,
    generatorKeyGroupScope,
    cycleIndex,
    globalRoundOffset,
    homeAwayRelevance,
  } = input;

  const slots: string[] = [...participantIds];
  if (slots.length % 2 === 1) {
    slots.push(ROUND_ROBIN_BYE_SENTINEL);
  }

  const paddedCount = slots.length;
  const roundCountInCycle = paddedCount - 1;
  const pairingsPerRound = paddedCount / 2;
  const fixtures: TournamentFixtureGenerationDefinition[] = [];

  let working = [...slots];

  for (let roundIndexInCycle = 0; roundIndexInCycle < roundCountInCycle; roundIndexInCycle += 1) {
    let slotIndexInRound = 0;
    for (let pair = 0; pair < pairingsPerRound; pair += 1) {
      const left = working[pair];
      const right = working[paddedCount - 1 - pair];
      if (left === ROUND_ROBIN_BYE_SENTINEL || right === ROUND_ROBIN_BYE_SENTINEL) {
        continue;
      }
      const sides = assignFixtureSides(left, right, cycleIndex, homeAwayRelevance);
      fixtures.push({
        stageKey,
        roundIndex: globalRoundOffset + roundIndexInCycle,
        slotIndexInRound,
        ...sides,
        generatorKey: buildRoundRobinGeneratorKey(
          stageKey,
          cycleIndex,
          roundIndexInCycle,
          slotIndexInRound,
          generatorKeyGroupScope,
        ),
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

/**
 * Pure circle-method round robin with optional repeated cycles.
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

  const meetingsPerOpponent =
    input.config?.meetingsPerOpponent ?? TOURNAMENT_ROUND_ROBIN_DEFAULT_MEETINGS_PER_OPPONENT;
  validateMeetingsPerOpponent(meetingsPerOpponent);

  const homeAwayRelevance =
    input.config?.homeAwayRelevance ?? HOME_AWAY_DEFAULT_FOR_NEUTRAL_YOUTH_TOURNAMENT;
  const generatorKeyGroupScope = input.config?.generatorKeyGroupScope;

  const participantIds = [...input.participantIds];
  assertDistinctParticipantIds(participantIds);

  const n = participantIds.length;
  if (n < TOURNAMENT_ROUND_ROBIN_MIN_PARTICIPANTS) {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_PARTICIPANTS_INSUFFICIENT",
      `Round robin requires at least ${TOURNAMENT_ROUND_ROBIN_MIN_PARTICIPANTS} participants`,
    );
  }

  const expectedCount = expectedRoundRobinFixtureCount(n, meetingsPerOpponent);
  if (expectedCount > TOURNAMENT_ROUND_ROBIN_TECHNICAL_MAX_FIXTURES) {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_FIXTURE_LIMIT_EXCEEDED",
      `Requested ${expectedCount} fixtures exceeds technical limit ${TOURNAMENT_ROUND_ROBIN_TECHNICAL_MAX_FIXTURES} (${n} participants × ${meetingsPerOpponent} meetings per opponent)`,
    );
  }

  const roundCountPerCycle = expectedRoundRobinRoundCount(n);
  const allFixtures: TournamentFixtureGenerationDefinition[] = [];

  for (let cycleIndex = 0; cycleIndex < meetingsPerOpponent; cycleIndex += 1) {
    const cycleFixtures = generateSingleCycleFixtures({
      participantIds,
      stageKey,
      generatorKeyGroupScope,
      cycleIndex,
      globalRoundOffset: cycleIndex * roundCountPerCycle,
      homeAwayRelevance,
    });
    allFixtures.push(...cycleFixtures);
  }

  return allFixtures;
}

/** Expected fixture count for n participants and m meetings per opponent. */
export function expectedRoundRobinFixtureCount(
  participantCount: number,
  meetingsPerOpponent: number = TOURNAMENT_ROUND_ROBIN_DEFAULT_MEETINGS_PER_OPPONENT,
): number {
  return ((participantCount * (participantCount - 1)) / 2) * meetingsPerOpponent;
}

/** Expected round count within one complete round-robin cycle. */
export function expectedRoundRobinRoundCount(participantCount: number): number {
  if (participantCount % 2 === 0) {
    return participantCount - 1;
  }
  return participantCount;
}

/** Total persisted roundIndex span across all cycles. */
export function expectedRoundRobinGlobalRoundCount(
  participantCount: number,
  meetingsPerOpponent: number = TOURNAMENT_ROUND_ROBIN_DEFAULT_MEETINGS_PER_OPPONENT,
): number {
  return expectedRoundRobinRoundCount(participantCount) * meetingsPerOpponent;
}
