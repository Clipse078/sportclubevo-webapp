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
  participantUniqueOpponentCounts: Readonly<Record<string, number>>;
  minUniqueOpponentCount: number;
  maxUniqueOpponentCount: number;
  participantRepeatAppearanceCounts: Readonly<Record<string, number>>;
  minRepeatAppearanceCount: number;
  maxRepeatAppearanceCount: number;
  homeCounts?: Readonly<Record<string, number>>;
  awayCounts?: Readonly<Record<string, number>>;
  maxHomeAwayImbalance?: number;
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
/**
 * Havel–Hakimi graphicality test (simple undirected graph, no loops).
 */
export function isGraphicDegreeSequence(degrees: readonly number[]): boolean {
  const havelHakimi = (seq: number[]): boolean => {
    const sorted = seq.filter((d) => d > 0).sort((a, b) => b - a);
    if (sorted.length === 0) {
      return true;
    }
    if (sorted.some((d) => d < 0 || d >= sorted.length)) {
      return false;
    }
    const v = sorted[0];
    const rest = sorted.slice(1);
    if (v > rest.length) {
      return false;
    }
    for (let i = 0; i < v; i += 1) {
      rest[i] -= 1;
      if (rest[i] < 0) {
        return false;
      }
    }
    return havelHakimi(rest);
  };
  return havelHakimi([...degrees]);
}

/**
 * Deterministic simple-graph edge list via Havel–Hakimi (canonical id tie-breaks).
 * Throws when the degree sequence is not realizable as a simple graph.
 */
export function constructSimpleGraphEdgesDeterministic(
  participantIds: readonly string[],
  degrees: readonly number[],
): Array<[string, string]> {
  if (participantIds.length !== degrees.length) {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_GENERATION_INVALID",
      "Participant count must match degree plan length",
    );
  }

  type Vertex = { id: string; degree: number };
  let vertices: Vertex[] = participantIds.map((id, index) => ({
    id,
    degree: degrees[index],
  }));

  const edges: Array<[string, string]> = [];

  const sortVertices = (list: Vertex[]): Vertex[] =>
    [...list].sort((a, b) => {
      if (b.degree !== a.degree) {
        return b.degree - a.degree;
      }
      return compareParticipantId(a.id, b.id);
    });

  while (vertices.some((v) => v.degree > 0)) {
    vertices = sortVertices(vertices.filter((v) => v.degree > 0));
    const hub = vertices[0];
    if (hub.degree > vertices.length - 1) {
      throw new RoundRobinGenerationValidationError(
        "TOURNAMENT_GENERATION_INVALID",
        "Degree sequence is not realizable as a simple graph",
      );
    }
    const targets = sortVertices(vertices.slice(1, 1 + hub.degree));
    for (const target of targets) {
      edges.push([hub.id, target.id]);
      target.degree -= 1;
    }
    hub.degree = 0;
  }

  return edges;
}

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

interface OpponentEdgeRecord {
  a: string;
  b: string;
  /** When set, prefer this structural round (greedy matching round). */
  preferredRoundIndex?: number;
}

function recordOpponentEdge(
  a: string,
  b: string,
  remaining: Map<string, number>,
  pairMultiplicity: Map<string, number>,
  out: OpponentEdgeRecord[],
  preferredRoundIndex?: number,
): void {
  const key = unorderedPairKey(a, b);
  pairMultiplicity.set(key, (pairMultiplicity.get(key) ?? 0) + 1);
  remaining.set(a, (remaining.get(a) ?? 0) - 1);
  remaining.set(b, (remaining.get(b) ?? 0) - 1);
  out.push({ a, b, preferredRoundIndex });
}

function assignStructuralRoundSlots(
  edges: readonly OpponentEdgeRecord[],
): Array<{ roundIndex: number; slotIndexInRound: number; a: string; b: string }> {
  const participantsByRound = new Map<number, Set<string>>();
  const slotByRound = new Map<number, number>();
  const placed: Array<{ roundIndex: number; slotIndexInRound: number; a: string; b: string }> = [];

  const canPlace = (roundIndex: number, a: string, b: string): boolean => {
    const used = participantsByRound.get(roundIndex);
    if (!used) return true;
    return !used.has(a) && !used.has(b);
  };

  const occupy = (roundIndex: number, a: string, b: string): void => {
    const used = participantsByRound.get(roundIndex) ?? new Set<string>();
    used.add(a);
    used.add(b);
    participantsByRound.set(roundIndex, used);
    const slot = slotByRound.get(roundIndex) ?? 0;
    slotByRound.set(roundIndex, slot + 1);
    placed.push({ roundIndex, slotIndexInRound: slot, a, b });
  };

  for (const edge of edges) {
    const preferred = edge.preferredRoundIndex;
    if (preferred !== undefined && canPlace(preferred, edge.a, edge.b)) {
      occupy(preferred, edge.a, edge.b);
      continue;
    }
    let roundIndex = 0;
    while (!canPlace(roundIndex, edge.a, edge.b)) {
      roundIndex += 1;
    }
    occupy(roundIndex, edge.a, edge.b);
  }

  return placed;
}

function materializeFixturesFromOpponentEdges(
  edges: readonly OpponentEdgeRecord[],
  participantIds: readonly string[],
  homeAwayRelevance: HomeAwayRelevance,
  stageKey: string,
): TournamentFixtureGenerationDefinition[] {
  const structured = assignStructuralRoundSlots(edges);
  const pairEncounterIndex = new Map<string, number>();
  const homeCounts = new Map<string, number>();
  const awayCounts = new Map<string, number>();
  for (const id of participantIds) {
    homeCounts.set(id, 0);
    awayCounts.set(id, 0);
  }

  return structured.map((edge, fixtureIndex) => {
    const key = unorderedPairKey(edge.a, edge.b);
    const encounter = pairEncounterIndex.get(key) ?? 0;
    pairEncounterIndex.set(key, encounter + 1);
    const sides = assignFixtureSides(
      edge.a,
      edge.b,
      encounter,
      homeAwayRelevance,
      homeCounts,
      awayCounts,
    );
    homeCounts.set(sides.sideAParticipantId, (homeCounts.get(sides.sideAParticipantId) ?? 0) + 1);
    awayCounts.set(sides.sideBParticipantId, (awayCounts.get(sides.sideBParticipantId) ?? 0) + 1);
    return {
      stageKey,
      roundIndex: edge.roundIndex,
      slotIndexInRound: edge.slotIndexInRound,
      ...sides,
      generatorKey: buildSmartMixGeneratorKey(stageKey, fixtureIndex),
    };
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
  options: { homeAwayRelevance?: HomeAwayRelevance } = {},
): SmartMixGenerationDiagnostics {
  const participantMatchCounts: Record<string, number> = {};
  const opponentsByParticipant = new Map<string, Set<string>>();
  for (const id of participantIds) {
    participantMatchCounts[id] = 0;
    opponentsByParticipant.set(id, new Set());
  }
  const pairMultiplicity = new Map<string, number>();
  const homeCounts: Record<string, number> = {};
  const awayCounts: Record<string, number> = {};
  for (const id of participantIds) {
    homeCounts[id] = 0;
    awayCounts[id] = 0;
  }

  for (const fixture of fixtures) {
    participantMatchCounts[fixture.sideAParticipantId] =
      (participantMatchCounts[fixture.sideAParticipantId] ?? 0) + 1;
    participantMatchCounts[fixture.sideBParticipantId] =
      (participantMatchCounts[fixture.sideBParticipantId] ?? 0) + 1;
    opponentsByParticipant.get(fixture.sideAParticipantId)?.add(fixture.sideBParticipantId);
    opponentsByParticipant.get(fixture.sideBParticipantId)?.add(fixture.sideAParticipantId);
    const key = unorderedPairKey(fixture.sideAParticipantId, fixture.sideBParticipantId);
    pairMultiplicity.set(key, (pairMultiplicity.get(key) ?? 0) + 1);
    if (options.homeAwayRelevance === "ON") {
      homeCounts[fixture.sideAParticipantId] =
        (homeCounts[fixture.sideAParticipantId] ?? 0) + 1;
      awayCounts[fixture.sideBParticipantId] =
        (awayCounts[fixture.sideBParticipantId] ?? 0) + 1;
    }
  }

  const matchCounts = Object.values(participantMatchCounts);
  let uniquePairCount = 0;
  let repeatedPairCount = 0;
  let maxPairMultiplicity = 0;
  for (const mult of pairMultiplicity.values()) {
    if (mult >= 1) uniquePairCount += 1;
    if (mult > 1) repeatedPairCount += 1;
    if (mult > maxPairMultiplicity) maxPairMultiplicity = mult;
  }

  const participantUniqueOpponentCounts: Record<string, number> = {};
  const participantRepeatAppearanceCounts: Record<string, number> = {};
  for (const id of participantIds) {
    const uniqueOpponents = opponentsByParticipant.get(id)?.size ?? 0;
    participantUniqueOpponentCounts[id] = uniqueOpponents;
    participantRepeatAppearanceCounts[id] =
      (participantMatchCounts[id] ?? 0) - uniqueOpponents;
  }
  const uniqueOpponentCounts = Object.values(participantUniqueOpponentCounts);
  const repeatAppearanceCounts = Object.values(participantRepeatAppearanceCounts);

  const base: SmartMixGenerationDiagnostics = {
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
    participantUniqueOpponentCounts,
    minUniqueOpponentCount: Math.min(...uniqueOpponentCounts),
    maxUniqueOpponentCount: Math.max(...uniqueOpponentCounts),
    participantRepeatAppearanceCounts,
    minRepeatAppearanceCount: Math.min(...repeatAppearanceCounts),
    maxRepeatAppearanceCount: Math.max(...repeatAppearanceCounts),
  };

  if (options.homeAwayRelevance === "ON") {
    let maxHomeAwayImbalance = 0;
    for (const id of participantIds) {
      const imbalance = Math.abs((homeCounts[id] ?? 0) - (awayCounts[id] ?? 0));
      if (imbalance > maxHomeAwayImbalance) {
        maxHomeAwayImbalance = imbalance;
      }
    }
    return {
      ...base,
      homeCounts,
      awayCounts,
      maxHomeAwayImbalance,
    };
  }

  return base;
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
  const opponentEdges: OpponentEdgeRecord[] = [];

  const appendEdge = (edge: PendingEdge, preferredRoundIndex?: number): void => {
    recordOpponentEdge(
      edge.a,
      edge.b,
      remaining,
      pairMultiplicity,
      opponentEdges,
      preferredRoundIndex,
    );
  };

  const maxPlanDegree = Math.max(...plan.participantDegrees);
  const simpleGraphRealizable =
    maxPlanDegree <= n - 1 && isGraphicDegreeSequence(plan.participantDegrees);

  if (simpleGraphRealizable) {
    const simpleEdges = constructSimpleGraphEdgesDeterministic(
      participantIds,
      plan.participantDegrees,
    );
    for (const [a, b] of simpleEdges) {
      appendEdge({ a, b, multiplicity: 0 });
    }
  } else {
    // Maximize unique opponent pairs first: at most one edge per unordered pair while both
    // endpoints still need matches (complete-graph layer before rematches).
    for (let i = 0; i < participantIds.length; i += 1) {
      for (let j = i + 1; j < participantIds.length; j += 1) {
        const a = participantIds[i];
        const b = participantIds[j];
        const key = unorderedPairKey(a, b);
        if ((remaining.get(a) ?? 0) <= 0 || (remaining.get(b) ?? 0) <= 0) {
          continue;
        }
        if ((pairMultiplicity.get(key) ?? 0) > 0) {
          continue;
        }
        appendEdge({ a, b, multiplicity: 0 });
      }
    }
  }

  // Rematch phase — repeated greedy matchings; lowest pair multiplicity, lex tie-break.
  let rematchRoundIndex = 0;
  while (remainingTotal(remaining) > 0) {
    const active = participantIds
      .filter((id) => (remaining.get(id) ?? 0) > 0)
      .sort((a, b) => {
        const remDiff = (remaining.get(b) ?? 0) - (remaining.get(a) ?? 0);
        if (remDiff !== 0) return remDiff;
        return compareParticipantId(a, b);
      });
    const matched = new Set<string>();
    let addedInRound = 0;

    for (const a of active) {
      if (matched.has(a)) continue;
      let best: PendingEdge | null = null;
      for (const b of active) {
        if (a === b || matched.has(b)) continue;
        if ((remaining.get(b) ?? 0) <= 0) continue;
        const candidate: PendingEdge = {
          a,
          b,
          multiplicity: pairMultiplicity.get(unorderedPairKey(a, b)) ?? 0,
        };
        if (!best) {
          best = candidate;
          continue;
        }
        const sorted = sortPendingEdges([best, candidate]);
        best = sorted[0];
      }
      if (!best) continue;
      appendEdge(best, rematchRoundIndex);
      matched.add(best.a);
      matched.add(best.b);
      addedInRound += 1;
    }

    if (addedInRound === 0) {
      const remainingSnapshot = participantIds
        .map((id) => `${id}:${remaining.get(id) ?? 0}`)
        .join(",");
      throw new RoundRobinGenerationValidationError(
        "TOURNAMENT_GENERATION_INVALID",
        `Smart Mix could not satisfy remaining participant degrees (${remainingSnapshot})`,
      );
    }
    rematchRoundIndex += 1;
  }

  if (opponentEdges.length !== plan.expectedFixtureCount) {
    throw new RoundRobinGenerationValidationError(
      "TOURNAMENT_GENERATION_INVALID",
      `Smart Mix expected ${plan.expectedFixtureCount} fixtures, generated ${opponentEdges.length}`,
    );
  }

  return materializeFixturesFromOpponentEdges(
    opponentEdges,
    participantIds,
    homeAwayRelevance,
    stageKey,
  );
}
