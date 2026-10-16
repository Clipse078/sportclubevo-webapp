/**
 * SCE-TOURNAMENT-PLANNER-01E3C-R1 — pure knockout bracket topology validation.
 */

import type {
  GenerateKnockoutBracketPureResult,
  GeneratedKnockoutFixtureSpec,
  KnockoutEntrantInput,
  KnockoutFixtureSideSource,
} from "./knockout-bracket-types";

export interface KnockoutTopologyValidationMetrics {
  orphanedInitialEntrantSourceCount: number;
  orphanedWinnerSourceCount: number;
  danglingKnockoutSideSourceCount: number;
  duplicatedActiveBracketSourceCount: number;
  duplicateKnockoutStructuralPositionCount: number;
  knockoutGeneratorKeyCollisionCount: number;
  generatorKeyStructuralPositionMismatchCount: number;
  fakeByeFixtureCount: number;
  knockoutSideSourceCardinality: 1;
  exactlyOneSourcePerKnockoutSide: true;
  knockoutBracketDag: boolean;
}

function entrantIdentityKey(entrant: KnockoutEntrantInput): string {
  return entrant.kind === "CONCRETE_PARTICIPANT"
    ? `p:${entrant.participantId}`
    : `q:${entrant.qualificationSourceId}`;
}

function sideIdentityKey(side: KnockoutFixtureSideSource): string | null {
  if (side.type === "CONCRETE_PARTICIPANT") {
    return `p:${side.participantId}`;
  }
  if (side.type === "QUALIFICATION_REFERENCE") {
    return `q:${side.qualificationSourceId}`;
  }
  return null;
}

function expectedGeneratorKey(stageKey: string, roundIndex: number, slotIndexInRound: number): string {
  return `knockout:${stageKey}:r${roundIndex}:s${slotIndexInRound}`;
}

function isKnockoutDag(fixtures: readonly GeneratedKnockoutFixtureSpec[]): boolean {
  const byKey = new Map(fixtures.map((fixture) => [fixture.logicalFixtureKey, fixture]));
  for (const fixture of fixtures) {
    for (const side of [fixture.sides.sideA, fixture.sides.sideB]) {
      if (side.type !== "WINNER_OF_FIXTURE") {
        continue;
      }
      const source = byKey.get(side.logicalFixtureKey);
      if (!source || source.roundIndex >= fixture.roundIndex) {
        return false;
      }
    }
  }

  const adjacency = new Map<string, string[]>();
  for (const fixture of fixtures) {
    adjacency.set(fixture.logicalFixtureKey, []);
  }
  for (const fixture of fixtures) {
    for (const side of [fixture.sides.sideA, fixture.sides.sideB]) {
      if (side.type === "WINNER_OF_FIXTURE") {
        adjacency.get(side.logicalFixtureKey)?.push(fixture.logicalFixtureKey);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (key: string): boolean => {
    if (visiting.has(key)) {
      return false;
    }
    if (visited.has(key)) {
      return true;
    }
    visiting.add(key);
    for (const next of adjacency.get(key) ?? []) {
      if (!dfs(next)) {
        return false;
      }
    }
    visiting.delete(key);
    visited.add(key);
    return true;
  };

  for (const key of adjacency.keys()) {
    if (!dfs(key)) {
      return false;
    }
  }
  return true;
}

/**
 * Computes structural invariant metrics for a generated knockout bracket (pure topology).
 */
export function validateKnockoutBracketTopology(
  result: GenerateKnockoutBracketPureResult,
  stageKey: string,
): KnockoutTopologyValidationMetrics {
  const { fixtures, diagnostics } = result;

  let duplicateKnockoutStructuralPositionCount = 0;
  const structuralKeys = new Set<string>();
  for (const fixture of fixtures) {
    const key = `${fixture.roundIndex}:${fixture.slotIndexInRound}`;
    if (structuralKeys.has(key)) {
      duplicateKnockoutStructuralPositionCount += 1;
    }
    structuralKeys.add(key);
  }

  const generatorKeys = fixtures.map((fixture) => fixture.generatorKey);
  const knockoutGeneratorKeyCollisionCount = generatorKeys.length - new Set(generatorKeys).size;

  let generatorKeyStructuralPositionMismatchCount = 0;
  for (const fixture of fixtures) {
    if (fixture.generatorKey !== expectedGeneratorKey(stageKey, fixture.roundIndex, fixture.slotIndexInRound)) {
      generatorKeyStructuralPositionMismatchCount += 1;
    }
  }

  let fakeByeFixtureCount = 0;
  for (const fixture of fixtures) {
    for (const side of [fixture.sides.sideA, fixture.sides.sideB]) {
      if (side.type === "CONCRETE_PARTICIPANT" && /bye|freilos|tbd/i.test(side.participantId)) {
        fakeByeFixtureCount += 1;
      }
    }
  }

  const byLogicalKey = new Map(fixtures.map((fixture) => [fixture.logicalFixtureKey, fixture]));
  let danglingKnockoutSideSourceCount = 0;
  for (const fixture of fixtures) {
    for (const side of [fixture.sides.sideA, fixture.sides.sideB]) {
      if (side.type === "WINNER_OF_FIXTURE" && !byLogicalKey.has(side.logicalFixtureKey)) {
        danglingKnockoutSideSourceCount += 1;
      }
    }
  }

  const winnerReferenceCounts = new Map<string, number>();
  for (const fixture of fixtures) {
    for (const side of [fixture.sides.sideA, fixture.sides.sideB]) {
      if (side.type === "WINNER_OF_FIXTURE") {
        winnerReferenceCounts.set(
          side.logicalFixtureKey,
          (winnerReferenceCounts.get(side.logicalFixtureKey) ?? 0) + 1,
        );
      }
    }
  }

  const finalRound = fixtures.length === 0 ? -1 : Math.max(...fixtures.map((fixture) => fixture.roundIndex));
  let orphanedWinnerSourceCount = 0;
  for (const fixture of fixtures) {
    if (fixture.roundIndex === finalRound) {
      continue;
    }
    const refs = winnerReferenceCounts.get(fixture.logicalFixtureKey) ?? 0;
    if (refs !== 1) {
      orphanedWinnerSourceCount += 1;
    }
  }

  const activeIdentityCounts = new Map<string, number>();
  for (const fixture of fixtures) {
    for (const side of [fixture.sides.sideA, fixture.sides.sideB]) {
      const identity = sideIdentityKey(side);
      if (identity) {
        activeIdentityCounts.set(identity, (activeIdentityCounts.get(identity) ?? 0) + 1);
      }
    }
  }

  let duplicatedActiveBracketSourceCount = 0;
  for (const count of activeIdentityCounts.values()) {
    if (count > 1) {
      duplicatedActiveBracketSourceCount += 1;
    }
  }

  let orphanedInitialEntrantSourceCount = 0;
  for (const advancement of diagnostics.byeAdvancements) {
    const key = entrantIdentityKey(advancement.entrant);
    if (!activeIdentityCounts.has(key)) {
      orphanedInitialEntrantSourceCount += 1;
    }
  }

  return {
    orphanedInitialEntrantSourceCount,
    orphanedWinnerSourceCount,
    danglingKnockoutSideSourceCount,
    duplicatedActiveBracketSourceCount,
    duplicateKnockoutStructuralPositionCount,
    knockoutGeneratorKeyCollisionCount,
    generatorKeyStructuralPositionMismatchCount,
    fakeByeFixtureCount,
    knockoutSideSourceCardinality: 1,
    exactlyOneSourcePerKnockoutSide: true,
    knockoutBracketDag: isKnockoutDag(fixtures),
  };
}

export function assertKnockoutBracketTopologyClosed(
  result: GenerateKnockoutBracketPureResult,
  stageKey: string,
  entrants: readonly KnockoutEntrantInput[],
): void {
  const metrics = validateKnockoutBracketTopology(result, stageKey);
  const { diagnostics, fixtures } = result;
  const n = diagnostics.entrantCount;

  if (fixtures.length !== n - 1) {
    throw new Error(`Expected ${n - 1} fixtures but got ${fixtures.length}`);
  }
  if (diagnostics.byeCount !== diagnostics.bracketSize - n) {
    throw new Error("BYE count mismatch");
  }
  if (diagnostics.realFixtureCount !== n - 1) {
    throw new Error("realFixtureCount mismatch");
  }

  const finalRound = Math.max(...fixtures.map((fixture) => fixture.roundIndex));
  const finals = fixtures.filter((fixture) => fixture.roundIndex === finalRound);
  if (finals.length !== 1) {
    throw new Error(`Expected exactly one final fixture, got ${finals.length}`);
  }

  const expectedKeys = new Set(entrants.map((entrant) => entrantIdentityKey(entrant)));
  const activeKeys = new Set<string>();
  for (const fixture of fixtures) {
    for (const side of [fixture.sides.sideA, fixture.sides.sideB]) {
      const key = sideIdentityKey(side);
      if (key) {
        activeKeys.add(key);
      }
    }
  }
  if (activeKeys.size !== expectedKeys.size) {
    throw new Error(
      `Entrant source coverage mismatch: expected ${expectedKeys.size} active sources, got ${activeKeys.size}`,
    );
  }
  for (const key of expectedKeys) {
    if (!activeKeys.has(key)) {
      throw new Error(`Missing active bracket source for entrant ${key}`);
    }
  }

  if (metrics.orphanedInitialEntrantSourceCount !== 0) {
    throw new Error("Orphaned initial entrant BYE advancement");
  }
  if (metrics.orphanedWinnerSourceCount !== 0) {
    throw new Error("Orphaned winner source (non-final fixture without exactly one consumer)");
  }
  if (metrics.danglingKnockoutSideSourceCount !== 0) {
    throw new Error("Dangling WINNER_OF_FIXTURE reference");
  }
  if (metrics.duplicatedActiveBracketSourceCount !== 0) {
    throw new Error("Duplicated active bracket source");
  }
  if (metrics.duplicateKnockoutStructuralPositionCount !== 0) {
    throw new Error("Duplicate structural knockout position");
  }
  if (metrics.knockoutGeneratorKeyCollisionCount !== 0) {
    throw new Error("Generator key collision");
  }
  if (metrics.generatorKeyStructuralPositionMismatchCount !== 0) {
    throw new Error("Generator key / structural position mismatch");
  }
  if (metrics.fakeByeFixtureCount !== 0) {
    throw new Error("Fake BYE fixture detected");
  }
  if (!metrics.knockoutBracketDag) {
    throw new Error("Knockout bracket is not a DAG");
  }
}
