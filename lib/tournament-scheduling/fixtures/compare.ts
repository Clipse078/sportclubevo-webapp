import type { TournamentFixtureDefinition } from "../types";
import type { TournamentFixtureGenerationDefinition } from "./types";

function logicalFixtureKey(input: {
  stageKey: string;
  roundIndex: number;
  slotIndexInRound: number;
  sideAParticipantId: string;
  sideBParticipantId: string;
}): string {
  const minSide =
    input.sideAParticipantId.localeCompare(input.sideBParticipantId) <= 0
      ? input.sideAParticipantId
      : input.sideBParticipantId;
  const maxSide = minSide === input.sideAParticipantId ? input.sideBParticipantId : input.sideAParticipantId;
  return `${input.stageKey}|${input.roundIndex}|${input.slotIndexInRound}|${minSide}|${maxSide}`;
}

export function fixtureDefinitionsToLogicalKeys(
  fixtures: readonly TournamentFixtureGenerationDefinition[],
): string[] {
  return fixtures.map((f) => logicalFixtureKey(f)).sort((a, b) => a.localeCompare(b));
}

export function persistedFixturesToLogicalKeys(
  fixtures: readonly TournamentFixtureDefinition[],
): string[] {
  return fixtures
    .map((f) =>
      logicalFixtureKey({
        stageKey: f.stageKey,
        roundIndex: f.roundIndex,
        slotIndexInRound: f.slotIndexInRound,
        sideAParticipantId: f.sideAParticipantId,
        sideBParticipantId: f.sideBParticipantId,
      }),
    )
    .sort((a, b) => a.localeCompare(b));
}

export function logicalFixtureSetsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function participantIdsFromFixtures(
  fixtures: readonly Pick<TournamentFixtureDefinition, "sideAParticipantId" | "sideBParticipantId">[],
): Set<string> {
  const ids = new Set<string>();
  for (const fixture of fixtures) {
    ids.add(fixture.sideAParticipantId);
    ids.add(fixture.sideBParticipantId);
  }
  return ids;
}
