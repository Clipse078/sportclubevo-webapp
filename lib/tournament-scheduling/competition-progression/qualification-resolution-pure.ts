/**
 * SCE-TOURNAMENT-PLANNER-01J — qualification source → participant (pure).
 */

import {
  calculateTournamentGroupStandings,
  participantAtGroupRank,
  type GroupStandingFixtureResult,
  type TournamentRankingConfigurationInput,
} from "./group-standings-pure";

export type QualificationSourceRef = {
  id: string;
  sourceType: "GROUP_RANK" | "WINNER_OF_FIXTURE" | "LOSER_OF_FIXTURE";
  sourceGroupId: string | null;
  rank: number | null;
  sourceFixtureId: string | null;
};

export type FixtureSideProgressionRow = {
  fixtureId: string;
  side: "A" | "B";
  sourceType: "CONCRETE_PARTICIPANT" | "QUALIFICATION_REFERENCE";
  participantId: string | null;
  qualificationSourceId: string | null;
};

export type ProgressionFixtureRow = {
  fixtureId: string;
  tournamentGroupId: string | null;
  phaseType: "GROUP_MIX" | "KNOCKOUT" | null;
  sideAParticipantId: string | null;
  sideBParticipantId: string | null;
  sides: readonly FixtureSideProgressionRow[];
};

export type CompletedFixtureOutcome = {
  fixtureId: string;
  state: "COMPLETED";
  sideAParticipantId: string;
  sideBParticipantId: string;
  scoreSideA: number;
  scoreSideB: number;
  winnerParticipantId: string | null;
};

export type GroupMembershipRow = {
  tournamentGroupId: string;
  participantIds: readonly string[];
};

export type SideResolutionUpdate = {
  fixtureId: string;
  side: "A" | "B";
  participantId: string | null;
};

export function resolveQualificationSourceParticipant(
  source: QualificationSourceRef,
  context: {
    qualificationSourcesById: ReadonlyMap<string, QualificationSourceRef>;
    groupMemberships: readonly GroupMembershipRow[];
    groupResults: ReadonlyMap<string, readonly GroupStandingFixtureResult[]>;
    rankingConfiguration: TournamentRankingConfigurationInput;
    outcomesByFixtureId: ReadonlyMap<string, CompletedFixtureOutcome>;
  },
): string | null {
  if (source.sourceType === "GROUP_RANK") {
    if (!source.sourceGroupId || source.rank == null || source.rank < 1) return null;
    const membership = context.groupMemberships.find(
      (g) => g.tournamentGroupId === source.sourceGroupId,
    );
    if (!membership) return null;
    const results = context.groupResults.get(source.sourceGroupId) ?? [];
    const standings = calculateTournamentGroupStandings({
      participantIds: membership.participantIds,
      completedFixtures: results,
      rankingConfiguration: context.rankingConfiguration,
    });
    return participantAtGroupRank(standings, source.rank);
  }

  if (source.sourceType === "WINNER_OF_FIXTURE") {
    if (!source.sourceFixtureId) return null;
    const outcome = context.outcomesByFixtureId.get(source.sourceFixtureId);
    if (!outcome) return null;
    return outcome.winnerParticipantId;
  }

  return null;
}

export function computeQualificationSideResolutions(input: {
  fixtures: readonly ProgressionFixtureRow[];
  qualificationSourcesById: ReadonlyMap<string, QualificationSourceRef>;
  groupMemberships: readonly GroupMembershipRow[];
  groupResults: ReadonlyMap<string, readonly GroupStandingFixtureResult[]>;
  rankingConfiguration: TournamentRankingConfigurationInput;
  outcomesByFixtureId: ReadonlyMap<string, CompletedFixtureOutcome>;
}): SideResolutionUpdate[] {
  const updates: SideResolutionUpdate[] = [];

  for (const fixture of input.fixtures) {
    for (const side of fixture.sides) {
      if (side.sourceType !== "QUALIFICATION_REFERENCE" || !side.qualificationSourceId) {
        continue;
      }
      const source = input.qualificationSourcesById.get(side.qualificationSourceId);
      if (!source) continue;
      const resolved = resolveQualificationSourceParticipant(source, {
        qualificationSourcesById: input.qualificationSourcesById,
        groupMemberships: input.groupMemberships,
        groupResults: input.groupResults,
        rankingConfiguration: input.rankingConfiguration,
        outcomesByFixtureId: input.outcomesByFixtureId,
      });
      updates.push({
        fixtureId: fixture.fixtureId,
        side: side.side,
        participantId: resolved,
      });
    }
  }

  return updates;
}

export function buildGroupResultsMap(
  fixtures: readonly ProgressionFixtureRow[],
  outcomesByFixtureId: ReadonlyMap<string, CompletedFixtureOutcome>,
): Map<string, GroupStandingFixtureResult[]> {
  const byGroup = new Map<string, GroupStandingFixtureResult[]>();
  for (const fixture of fixtures) {
    if (!fixture.tournamentGroupId) continue;
    const outcome = outcomesByFixtureId.get(fixture.fixtureId);
    if (!outcome) continue;
    const list = byGroup.get(fixture.tournamentGroupId) ?? [];
    list.push({
      fixtureId: fixture.fixtureId,
      sideAParticipantId: outcome.sideAParticipantId,
      sideBParticipantId: outcome.sideBParticipantId,
      scoreSideA: outcome.scoreSideA,
      scoreSideB: outcome.scoreSideB,
    });
    byGroup.set(fixture.tournamentGroupId, list);
  }
  return byGroup;
}
