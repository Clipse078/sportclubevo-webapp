/**
 * Deterministic Smart Mix fixture generation (SCE-TOURNAMENT-PLANNER-01E2).
 *
 * Builds a balanced opponent multigraph: target match counts per participant,
 * maximize unique opponents first, then fair rematch distribution.
 * Structural roundIndex/slotIndexInRound are not a schedule — 01F owns time.
 */

import {
  ROUND_ROBIN_BYE_SENTINEL,
  TOURNAMENT_FIXTURE_STAGE_MAIN,
  TOURNAMENT_GENERATION_TECHNICAL_MAX_FIXTURES,
  TOURNAMENT_ROUND_ROBIN_MIN_PARTICIPANTS,
} from "./constants";
import type { SmartMixGenerationInput, TournamentFixtureGenerationDefinition } from "./types";
import { assertDistinctParticipantIds, compareParticipantId } from "./ordering";
import { RoundRobinGenerationValidationError } from "./errors";
import type { HomeAwayRelevance } from "../smart-generator-architecture";
import { HOME_AWAY_DEFAULT_FOR_NEUTRAL_YOUTH_TOURNAMENT } from "../smart-generator-architecture";

export type SmartMixBalanceClassification = "EXACT" | "NEAR_BALANCED_PARITY";

export interface SmartMixTargetDegreePlan {
  targetMatchesPerParticipant: number;
  participantDegrees: readonly number[];
  balanceClassification: SmartMixBalanceClassification;
  /** Participants (ids) with match count below target when parity applies. */
  reducedMatchParticipantIds: readonly string[];
  expectedFixtureCount: number;
}

export interface SmartMixGenerationDiagnostics {
  targetMatchesPerParticipant: number;
  balanceClassification: SmartMixBalanceClassification;
  reducedMatchParticipantIds: readonly string[];
  fixtureCount: number;
  participantMatchCounts: Readonly<Record<string, number>>;
  minParticipantMatchCount: number;
  maxParticipantMatchCount: number;
  uniquePairCount: number;
  repeatedPairCount: number;
  maxPairMultiplicity: number;
}

export function buildSmartMixGeneratorKey(stageKey: string, fixtureIndex: number): string {
  return `smart-mix:${stageKey}:${fixtureIndex}`;
}

function unorderedPairKey(a: string, b: string): string {
  return compareParticipantId(a, b) <= 0 ? `${a}|${b}` : `${b}|${a}`;
}

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
  pairEncounterIndex: number,
  homeAwayRelevance: HomeAwayRelevance,
  homeCounts: Map<string, number>,
  awayCounts: Map<string, number>,
): { sideAParticipantId: string; sideBParticipantId: string } {
  const neutral = assignNeutralSides(participantA, participantB);
  if (homeAwayRelevance === "OFF") {
    return neutral;
  }
  if (pairEncounterIndex % 2 === 1) {
    return {
      sideAParticipantId: neutral.sideBParticipantId,
      sideBParticipantId: neutral.sideAParticipantId,
    };
  }

  const optionNeutral = neutral;
  const optionFlipped = {
    sideAParticipantId: neutral.sideBParticipantId,
    sideBParticipantId: neutral.sideAParticipantId,
  };

  function imbalanceAfter(option: {
    sideAParticipantId: string;
    sideBParticipantId: string;
  }): number {
    const a = option.sideAParticipantId;
    const b = option.sideBParticipantId;
    const aHome = (homeCounts.get(a) ?? 0) + 1;
    const aAway = awayCounts.get(a) ?? 0;
    const bHome = homeCounts.get(b) ?? 0;
    const bAway = (awayCounts.get(b) ?? 0) + 1;
    return Math.abs(aHome - aAway) + Math.abs(bHome - bAway);
  }

  return imbalanceAfter(optionNeutral) <= imbalanceAfter(optionFlipped)
    ? optionNeutral
    : optionFlipped;
}

function validateTargetMatchesPerParticipant(target: number): void {
  if (!Number.isInteger(target) || target < 1) {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_SMART_MIX_TARGET_INVALID",
      "targetMatchesPerParticipant must be a positive integer",
    );
  }
}

/**
 * Parity policy: when n×k is odd, the first participant in canonical order
 * receives (k−1); all others receive k. No participant exceeds k.
 */
export function planSmartMixTargetDegrees(
  participantIds: readonly string[],
  targetMatchesPerParticipant: number,
): SmartMixTargetDegreePlan {
  validateTargetMatchesPerParticipant(targetMatchesPerParticipant);
  const n = participantIds.length;
  const product = n * targetMatchesPerParticipant;
  if (product % 2 === 0) {
    const degrees = participantIds.map(() => targetMatchesPerParticipant);
    return {
      targetMatchesPerParticipant,
      participantDegrees: degrees,
      balanceClassification: "EXACT",
      reducedMatchParticipantIds: [],
      expectedFixtureCount: product / 2,
    };
  }

  const reducedId = participantIds[0];
  const degrees = participantIds.map((id, index) =>
    index === 0 ? targetMatchesPerParticipant - 1 : targetMatchesPerParticipant,
  );
  const totalAppearances = degrees.reduce((sum, d) => sum + d, 0);
  return {
    targetMatchesPerParticipant,
    participantDegrees: degrees,
    balanceClassification: "NEAR_BALANCED_PARITY",
    reducedMatchParticipantIds: [reducedId],
    expectedFixtureCount: totalAppearances / 2,
  };
}

/** Circle-method round pairings (BYE excluded from output). */
export function buildRoundRobinRoundPairings(
  participantIds: readonly string[],
): Array<Array<[string, string]>> {
  const slots: string[] = [...participantIds];
  if (slots.length % 2 === 1) {
    slots.push(ROUND_ROBIN_BYE_SENTINEL);
  }
  const paddedCount = slots.length;
  const roundCount = paddedCount - 1;
  const pairingsPerRound = paddedCount / 2;
  const rounds: Array<Array<[string, string]>> = [];
  let working = [...slots];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const roundPairs: Array<[string, string]> = [];
    for (let pair = 0; pair < pairingsPerRound; pair += 1) {
      const left = working[pair];
      const right = working[paddedCount - 1 - pair];
      if (left === ROUND_ROBIN_BYE_SENTINEL || right === ROUND_ROBIN_BYE_SENTINEL) {
        continue;
      }
      roundPairs.push([left, right]);
    }
    rounds.push(roundPairs);

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

  return rounds;
}

interface PendingEdge {
  a: string;
  b: string;
  multiplicity: number;
}

function addEdge(
  a: string,
  b: string,
  remaining: Map<string, number>,
  pairMultiplicity: Map<string, number>,
  pairEncounterIndex: Map<string, number>,
  homeAwayRelevance: HomeAwayRelevance,
  homeCounts: Map<string, number>,
  awayCounts: Map<string, number>,
  stageKey: string,
  roundIndex: number,
  slotIndexInRound: number,
  fixtureIndex: number,
  out: TournamentFixtureGenerationDefinition[],
): void {
  const key = unorderedPairKey(a, b);
  const encounter = pairEncounterIndex.get(key) ?? 0;
  pairEncounterIndex.set(key, encounter + 1);
  pairMultiplicity.set(key, (pairMultiplicity.get(key) ?? 0) + 1);
  remaining.set(a, (remaining.get(a) ?? 0) - 1);
  remaining.set(b, (remaining.get(b) ?? 0) - 1);
  const sides = assignFixtureSides(
    a,
    b,
    encounter,
    homeAwayRelevance,
    homeCounts,
    awayCounts,
  );
  homeCounts.set(sides.sideAParticipantId, (homeCounts.get(sides.sideAParticipantId) ?? 0) + 1);
  awayCounts.set(sides.sideBParticipantId, (awayCounts.get(sides.sideBParticipantId) ?? 0) + 1);
  out.push({
    stageKey,
    roundIndex,
    slotIndexInRound,
    ...sides,
    generatorKey: buildSmartMixGeneratorKey(stageKey, fixtureIndex),
  });
}

function sortPendingEdges(edges: PendingEdge[]): PendingEdge[] {
  return [...edges].sort((x, y) => {
    if (x.multiplicity !== y.multiplicity) return x.multiplicity - y.multiplicity;
    const cmpA = compareParticipantId(x.a, y.a);
    if (cmpA !== 0) return cmpA;
    return compareParticipantId(x.b, y.b);
  });
}

function pickNextEdge(
  participantIds: readonly string[],
  remaining: Map<string, number>,
  pairMultiplicity: Map<string, number>,
  uniqueOnly: boolean,
): PendingEdge | null {
  const candidates = buildCandidateEdges(participantIds, remaining, pairMultiplicity, uniqueOnly);
  const sorted = sortPendingEdges(candidates);
  return sorted[0] ?? null;
}

function buildCandidateEdges(
  participantIds: readonly string[],
  remaining: Map<string, number>,
  pairMultiplicity: Map<string, number>,
  uniqueOnly: boolean,
): PendingEdge[] {
  const candidates: PendingEdge[] = [];
  for (let i = 0; i < participantIds.length; i += 1) {
    for (let j = i + 1; j < participantIds.length; j += 1) {
      const a = participantIds[i];
      const b = participantIds[j];
      if ((remaining.get(a) ?? 0) <= 0 || (remaining.get(b) ?? 0) <= 0) {
        continue;
      }
      const mult = pairMultiplicity.get(unorderedPairKey(a, b)) ?? 0;
      if (uniqueOnly && mult > 0) {
        continue;
      }
      candidates.push({ a, b, multiplicity: mult });
    }
  }
  return candidates;
}

function remainingTotal(remaining: Map<string, number>): number {
  let total = 0;
  for (const value of remaining.values()) {
    total += value;
  }
  return total;
}

export function deriveSmartMixDiagnostics(
  participantIds: readonly string[],
  fixtures: readonly TournamentFixtureGenerationDefinition[],
  plan: SmartMixTargetDegreePlan,
): SmartMixGenerationDiagnostics {
  const participantMatchCounts: Record<string, number> = {};
  for (const id of participantIds) {
    participantMatchCounts[id] = 0;
  }
  const pairMultiplicity = new Map<string, number>();
  for (const fixture of fixtures) {
    participantMatchCounts[fixture.sideAParticipantId] =
      (participantMatchCounts[fixture.sideAParticipantId] ?? 0) + 1;
    participantMatchCounts[fixture.sideBParticipantId] =
      (participantMatchCounts[fixture.sideBParticipantId] ?? 0) + 1;
    const key = unorderedPairKey(fixture.sideAParticipantId, fixture.sideBParticipantId);
    pairMultiplicity.set(key, (pairMultiplicity.get(key) ?? 0) + 1);
  }

  const matchCounts = Object.values(participantMatchCounts);
  let uniquePairCount = 0;
  let repeatedPairCount = 0;
  let maxPairMultiplicity = 0;
  for (const mult of pairMultiplicity.values()) {
    if (mult === 1) uniquePairCount += 1;
    if (mult > 1) repeatedPairCount += 1;
    if (mult > maxPairMultiplicity) maxPairMultiplicity = mult;
  }

  return {
    targetMatchesPerParticipant: plan.targetMatchesPerParticipant,
    balanceClassification: plan.balanceClassification,
    reducedMatchParticipantIds: plan.reducedMatchParticipantIds,
    fixtureCount: fixtures.length,
    participantMatchCounts,
    minParticipantMatchCount: Math.min(...matchCounts),
    maxParticipantMatchCount: Math.max(...matchCounts),
    uniquePairCount,
    repeatedPairCount,
    maxPairMultiplicity,
  };
}

/**
 * Pure Smart Mix generator — deterministic opponent multigraph.
 */
export function generateSmartMixFixtures(
  input: SmartMixGenerationInput,
): TournamentFixtureGenerationDefinition[] {
  const stageKey = input.config?.stageKey ?? TOURNAMENT_FIXTURE_STAGE_MAIN;
  const targetMatchesPerParticipant = input.config?.targetMatchesPerParticipant;
  if (targetMatchesPerParticipant === undefined) {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_SMART_MIX_TARGET_INVALID",
      "targetMatchesPerParticipant is required for SMART_MIX",
    );
  }

  const homeAwayRelevance =
    input.config?.homeAwayRelevance ?? HOME_AWAY_DEFAULT_FOR_NEUTRAL_YOUTH_TOURNAMENT;

  const participantIds = [...input.participantIds];
  assertDistinctParticipantIds(participantIds);

  const n = participantIds.length;
  if (n < TOURNAMENT_ROUND_ROBIN_MIN_PARTICIPANTS) {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_PARTICIPANTS_INSUFFICIENT",
      `Smart Mix requires at least ${TOURNAMENT_ROUND_ROBIN_MIN_PARTICIPANTS} participants`,
    );
  }

  const plan = planSmartMixTargetDegrees(participantIds, targetMatchesPerParticipant);
  if (plan.expectedFixtureCount > TOURNAMENT_GENERATION_TECHNICAL_MAX_FIXTURES) {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_FIXTURE_LIMIT_EXCEEDED",
      `Requested ${plan.expectedFixtureCount} fixtures exceeds technical limit ${TOURNAMENT_GENERATION_TECHNICAL_MAX_FIXTURES} (${n} participants × target ${targetMatchesPerParticipant})`,
    );
  }

  const remaining = new Map<string, number>();
  participantIds.forEach((id, index) => {
    remaining.set(id, plan.participantDegrees[index]);
  });

  const pairMultiplicity = new Map<string, number>();
  const pairEncounterIndex = new Map<string, number>();
  const homeCounts = new Map<string, number>();
  const awayCounts = new Map<string, number>();
  for (const id of participantIds) {
    homeCounts.set(id, 0);
    awayCounts.set(id, 0);
  }
  const fixtures: TournamentFixtureGenerationDefinition[] = [];
  let fixtureIndex = 0;

  const rrRounds = buildRoundRobinRoundPairings(participantIds);
  let rrCursor = 0;

  const appendEdge = (edge: PendingEdge, roundIndex: number, slotIndexInRound: number): void => {
    addEdge(
      edge.a,
      edge.b,
      remaining,
      pairMultiplicity,
      pairEncounterIndex,
      homeAwayRelevance,
      homeCounts,
      awayCounts,
      stageKey,
      roundIndex,
      slotIndexInRound,
      fixtureIndex,
      fixtures,
    );
    fixtureIndex += 1;
  };

  // Primary pass — circle-method rounds (unique opponents first, fair rematches on later cycles).
  while (remainingTotal(remaining) > 0) {
    let addedInCycle = 0;
    const cycleStart = rrCursor;
    do {
      const roundPairs = rrRounds[rrCursor % rrRounds.length];
      rrCursor += 1;
      let slot = 0;
      for (const [a, b] of roundPairs) {
        if ((remaining.get(a) ?? 0) <= 0 || (remaining.get(b) ?? 0) <= 0) {
          continue;
        }
        appendEdge({ a, b, multiplicity: pairMultiplicity.get(unorderedPairKey(a, b)) ?? 0 }, rrCursor - 1, slot);
        slot += 1;
        addedInCycle += 1;
      }
    } while (rrCursor - cycleStart < rrRounds.length && remainingTotal(remaining) > 0);

    if (addedInCycle === 0) {
      break;
    }
  }

  // Fallback — lowest pair multiplicity, lexicographic tie-break (preserves realizability).
  while (remainingTotal(remaining) > 0) {
    const next = pickNextEdge(participantIds, remaining, pairMultiplicity, false);
    if (!next) {
      const remainingSnapshot = participantIds
        .map((id) => `${id}:${remaining.get(id) ?? 0}`)
        .join(",");
      throw new RoundRobinGenerationValidationError(
        "TOURNAMENT_GENERATION_INVALID",
        `Smart Mix could not satisfy remaining participant degrees (${remainingSnapshot})`,
      );
    }
    appendEdge(next, fixtureIndex, 0);
  }

  if (fixtures.length !== plan.expectedFixtureCount) {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_GENERATION_INVALID",
      `Smart Mix expected ${plan.expectedFixtureCount} fixtures, generated ${fixtures.length}`,
    );
  }

  return fixtures;
}
