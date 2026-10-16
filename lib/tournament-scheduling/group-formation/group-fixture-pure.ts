/**
 * Pure helpers for group-scoped fixture validation and Smart Mix diagnostics.
 */

import type { TournamentFixtureGenerationDefinition } from "../fixtures/types";

function unorderedPairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function assertNoCrossGroupFixtures(
  fixtures: readonly TournamentFixtureGenerationDefinition[],
  groupParticipantSets: ReadonlyMap<string, ReadonlySet<string>>,
): void {
  for (const fixture of fixtures) {
    let ownerGroup: string | null = null;
    for (const [groupId, members] of groupParticipantSets) {
      const aIn = members.has(fixture.sideAParticipantId);
      const bIn = members.has(fixture.sideBParticipantId);
      if (aIn && bIn) {
        if (ownerGroup !== null && ownerGroup !== groupId) {
          throw new Error("Fixture spans multiple groups");
        }
        ownerGroup = groupId;
        continue;
      }
      if (aIn !== bIn) {
        throw new Error("Cross-group fixture detected");
      }
    }
    if (ownerGroup === null) {
      throw new Error("Fixture participants not found in any group");
    }
  }
}

export function computeSmartMixPairDiagnostics(
  fixtures: readonly TournamentFixtureGenerationDefinition[],
): {
  uniquePairCount: number;
  repeatedPairCount: number;
  maxPairMultiplicity: number;
} {
  const multiplicity = new Map<string, number>();
  for (const fixture of fixtures) {
    const key = unorderedPairKey(fixture.sideAParticipantId, fixture.sideBParticipantId);
    multiplicity.set(key, (multiplicity.get(key) ?? 0) + 1);
  }
  let uniquePairCount = 0;
  let repeatedPairCount = 0;
  let maxPairMultiplicity = 0;
  for (const count of multiplicity.values()) {
    maxPairMultiplicity = Math.max(maxPairMultiplicity, count);
    if (count === 1) uniquePairCount += 1;
    else repeatedPairCount += 1;
  }
  return { uniquePairCount, repeatedPairCount, maxPairMultiplicity };
}

export function countFixturesByGroup(
  fixtures: readonly { tournamentGroupId: string | null }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const fixture of fixtures) {
    if (!fixture.tournamentGroupId) continue;
    out[fixture.tournamentGroupId] = (out[fixture.tournamentGroupId] ?? 0) + 1;
  }
  return out;
}
