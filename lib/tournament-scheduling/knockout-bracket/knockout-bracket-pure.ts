/**
 * SCE-TOURNAMENT-PLANNER-01E3C — pure deterministic knockout bracket + BYE topology.
 *
 * BYE representation: omitted first-round (or any-round) fixture; the entrant or
 * qualification source propagates structurally to the next round side (no fake opponent).
 *
 * BYE distribution: standard bracket seed order (iterative seed spread); BYE slots
 * occupy the lowest seed numbers beyond entrantCount, so higher caller-order seeds
 * receive BYEs first (e.g. seed 1 vs BYE before seed 2 vs BYE).
 */

import { TOURNAMENT_GENERATION_TECHNICAL_MAX_FIXTURES } from "../fixtures/constants";
import type {
  GenerateKnockoutBracketPureInput,
  GenerateKnockoutBracketPureResult,
  GeneratedKnockoutFixtureSpec,
  KnockoutByeAdvancementSpec,
  KnockoutEntrantInput,
  KnockoutFixtureSideSpec,
} from "./knockout-bracket-types";

export const KNOCKOUT_BYE_DISTRIBUTION_ALGORITHM =
  "STANDARD_BRACKET_SEED_ORDER_LOWEST_SEEDS_ARE_BYE_SLOTS" as const;

export const KNOCKOUT_ROUND_MODEL =
  "STRUCTURAL_ROUND_INDEX_AND_SLOT_INDEX_IN_ROUND_ON_TOURNAMENT_FIXTURE" as const;

export const KNOCKOUT_BYE_REPRESENTATION =
  "OMITTED_FIXTURE_WITH_DIRECT_ENTRANT_OR_QUALIFICATION_SOURCE_ADVANCEMENT" as const;

export class KnockoutBracketValidationError extends Error {
  readonly code:
    | "INSUFFICIENT_ENTRANTS"
    | "DUPLICATE_ENTRANT"
    | "FIXTURE_LIMIT"
    | "INVALID_BRACKET";

  constructor(
    code: "INSUFFICIENT_ENTRANTS" | "DUPLICATE_ENTRANT" | "FIXTURE_LIMIT" | "INVALID_BRACKET",
    message: string,
  ) {
    super(message);
    this.name = "KnockoutBracketValidationError";
    this.code = code;
  }
}

export function smallestPowerOfTwoGte(value: number): number {
  if (value <= 0) {
    return 1;
  }
  let size = 1;
  while (size < value) {
    size *= 2;
  }
  return size;
}

export function computeKnockoutByeCount(entrantCount: number, bracketSize: number): number {
  return bracketSize - entrantCount;
}

/**
 * Iterative standard bracket seed spread (deterministic).
 * Example bracketSize 8 → [1, 8, 4, 5, 2, 7, 3, 6].
 */
export function buildBracketSeedOrder(bracketSize: number): number[] {
  if (bracketSize < 2 || (bracketSize & (bracketSize - 1)) !== 0) {
    throw new KnockoutBracketValidationError("INVALID_BRACKET", "Bracket size must be a power of 2");
  }
  let seeds = [1];
  let spread = 1;
  while (spread < bracketSize) {
    spread *= 2;
    const next: number[] = [];
    for (const seed of seeds) {
      next.push(seed);
      next.push(spread + 1 - seed);
    }
    seeds = next;
  }
  return seeds;
}

function entrantIdentityKey(entrant: KnockoutEntrantInput): string {
  return entrant.kind === "CONCRETE_PARTICIPANT"
    ? `p:${entrant.participantId}`
    : `q:${entrant.qualificationSourceId}`;
}

function assertDistinctEntrants(entrants: readonly KnockoutEntrantInput[]): void {
  const keys = new Set<string>();
  for (const entrant of entrants) {
    const key = entrantIdentityKey(entrant);
    if (keys.has(key)) {
      throw new KnockoutBracketValidationError(
        "DUPLICATE_ENTRANT",
        "Duplicate knockout entrant in ordered input",
      );
    }
    keys.add(key);
  }
}

type SlotLeaf = { kind: "ENTRANT"; entrant: KnockoutEntrantInput } | { kind: "BYE" };

type AdvanceSource =
  | { type: "ENTRANT"; entrant: KnockoutEntrantInput }
  | { type: "WINNER"; logicalFixtureKey: string };

type SlotNode =
  | { kind: "BYE" }
  | { kind: "ADVANCE"; source: AdvanceSource }
  | { kind: "FIXTURE"; logicalFixtureKey: string };

function buildGeneratorKey(
  stageKey: string,
  roundIndex: number,
  slotIndexInRound: number,
): string {
  return `knockout:${stageKey}:r${roundIndex}:s${slotIndexInRound}`;
}

function buildLogicalFixtureKey(roundIndex: number, slotIndexInRound: number): string {
  return `r${roundIndex}:s${slotIndexInRound}`;
}

function toFixtureSideSource(source: AdvanceSource): KnockoutFixtureSideSpec["sideA"] {
  if (source.type === "ENTRANT") {
    if (source.entrant.kind === "CONCRETE_PARTICIPANT") {
      return { type: "CONCRETE_PARTICIPANT", participantId: source.entrant.participantId };
    }
    return {
      type: "QUALIFICATION_REFERENCE",
      qualificationSourceId: source.entrant.qualificationSourceId,
    };
  }
  return { type: "WINNER_OF_FIXTURE", logicalFixtureKey: source.logicalFixtureKey };
}

function combineSlots(
  left: SlotNode,
  right: SlotNode,
  stageKey: string,
  roundIndex: number,
  slotIndexInRound: number,
  fixtures: GeneratedKnockoutFixtureSpec[],
): SlotNode {
  if (left.kind === "BYE" && right.kind === "BYE") {
    throw new KnockoutBracketValidationError("INVALID_BRACKET", "Two BYE slots cannot be paired");
  }
  if (left.kind === "BYE") {
    return right;
  }
  if (right.kind === "BYE") {
    return left;
  }

  const leftSource: AdvanceSource =
    left.kind === "ADVANCE"
      ? left.source
      : { type: "WINNER", logicalFixtureKey: left.logicalFixtureKey };
  const rightSource: AdvanceSource =
    right.kind === "ADVANCE"
      ? right.source
      : { type: "WINNER", logicalFixtureKey: right.logicalFixtureKey };

  const logicalFixtureKey = buildLogicalFixtureKey(roundIndex, slotIndexInRound);
  const sideA = toFixtureSideSource(leftSource);
  const sideB = toFixtureSideSource(rightSource);

  if (
    sideA.type === "CONCRETE_PARTICIPANT" &&
    sideB.type === "CONCRETE_PARTICIPANT" &&
    sideA.participantId === sideB.participantId
  ) {
    throw new KnockoutBracketValidationError(
      "INVALID_BRACKET",
      "Fixture sides must reference two distinct entrants",
    );
  }

  fixtures.push({
    roundIndex,
    slotIndexInRound,
    stageKey,
    generatorKey: buildGeneratorKey(stageKey, roundIndex, slotIndexInRound),
    logicalFixtureKey,
    sides: { sideA, sideB },
  });

  return { kind: "FIXTURE", logicalFixtureKey };
}

function collectByeAdvancements(
  seedOrder: number[],
  entrants: readonly KnockoutEntrantInput[],
  entrantCount: number,
): KnockoutByeAdvancementSpec[] {
  const advancements: KnockoutByeAdvancementSpec[] = [];
  const firstRoundSlots = seedOrder.length / 2;
  for (let slot = 0; slot < firstRoundSlots; slot++) {
    const leftSeed = seedOrder[slot * 2]!;
    const rightSeed = seedOrder[slot * 2 + 1]!;
    const leftIsBye = leftSeed > entrantCount;
    const rightIsBye = rightSeed > entrantCount;
    if (leftIsBye === rightIsBye) {
      continue;
    }
    const entrantSeed = leftIsBye ? rightSeed : leftSeed;
    advancements.push({
      roundIndex: 0,
      slotIndexInRound: slot,
      entrant: entrants[entrantSeed - 1]!,
    });
  }
  return advancements;
}

export function generateKnockoutBracketPure(
  input: GenerateKnockoutBracketPureInput,
): GenerateKnockoutBracketPureResult {
  const entrantCount = input.entrants.length;
  if (entrantCount < 2) {
    throw new KnockoutBracketValidationError(
      "INSUFFICIENT_ENTRANTS",
      "Knockout bracket generation requires at least two entrants",
    );
  }
  assertDistinctEntrants(input.entrants);

  const bracketSize = smallestPowerOfTwoGte(entrantCount);
  const byeCount = computeKnockoutByeCount(entrantCount, bracketSize);
  const roundCount = Math.log2(bracketSize);
  const expectedFixtures = entrantCount - 1;

  if (expectedFixtures > TOURNAMENT_GENERATION_TECHNICAL_MAX_FIXTURES) {
    throw new KnockoutBracketValidationError(
      "FIXTURE_LIMIT",
      `Requested ${expectedFixtures} knockout fixtures exceeds technical limit ${TOURNAMENT_GENERATION_TECHNICAL_MAX_FIXTURES}`,
    );
  }

  const seedOrder = buildBracketSeedOrder(bracketSize);
  const leaves: SlotLeaf[] = seedOrder.map((seed) =>
    seed > entrantCount
      ? { kind: "BYE" }
      : { kind: "ENTRANT", entrant: input.entrants[seed - 1]! },
  );

  let nodes: SlotNode[] = leaves.map((leaf) =>
    leaf.kind === "BYE"
      ? { kind: "BYE" }
      : { kind: "ADVANCE", source: { type: "ENTRANT", entrant: leaf.entrant } },
  );

  const fixtures: GeneratedKnockoutFixtureSpec[] = [];
  let roundIndex = 0;
  while (nodes.length > 1) {
    const next: SlotNode[] = [];
    for (let slot = 0; slot < nodes.length / 2; slot++) {
      const left = nodes[slot * 2]!;
      const right = nodes[slot * 2 + 1]!;
      next.push(combineSlots(left, right, input.stageKey, roundIndex, slot, fixtures));
    }
    nodes = next;
    roundIndex += 1;
  }

  if (fixtures.length !== expectedFixtures) {
    throw new KnockoutBracketValidationError(
      "INVALID_BRACKET",
      `Expected ${expectedFixtures} real fixtures but generated ${fixtures.length}`,
    );
  }

  const fixturesByRound: Record<number, number> = {};
  for (const fixture of fixtures) {
    fixturesByRound[fixture.roundIndex] = (fixturesByRound[fixture.roundIndex] ?? 0) + 1;
  }

  return {
    fixtures,
    diagnostics: {
      entrantCount,
      bracketSize,
      byeCount,
      roundCount,
      realFixtureCount: fixtures.length,
      fixturesByRound,
      byeAdvancements: collectByeAdvancements(seedOrder, input.entrants, entrantCount),
    },
  };
}
