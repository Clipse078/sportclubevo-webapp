/**
 * Build group standings view models for Planung (01J).
 */

import {
  calculateTournamentGroupStandings,
  type GroupStandingRow,
} from "@/lib/tournament-scheduling/competition-progression/group-standings-pure";
import type { TournamentPlanungParticipantIdentity } from "./types";

export type PlanungGroupStandingsSection = {
  groupId: string;
  groupLabel: string;
  rows: readonly {
    position: number;
    participantId: string;
    displayName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    tiedAtPosition: boolean;
  }[];
};

export function buildPlanungGroupStandings(input: {
  groups: readonly {
    id: string;
    label: string;
    participantIds: readonly string[];
  }[];
  completedGroupResults: readonly {
    tournamentGroupId: string;
    sideAParticipantId: string;
    sideBParticipantId: string;
    scoreSideA: number;
    scoreSideB: number;
    fixtureId: string;
  }[];
  rankingConfiguration: {
    winPoints: number;
    drawPoints: number;
    lossPoints: number;
    tiebreakOrder: readonly ("POINTS" | "GOAL_DIFFERENCE" | "GOALS_SCORED" | "HEAD_TO_HEAD")[];
  };
  participants: readonly TournamentPlanungParticipantIdentity[];
}): PlanungGroupStandingsSection[] {
  const nameById = new Map(input.participants.map((p) => [p.participantId, p.displayName]));

  return input.groups.map((group) => {
    const fixtures = input.completedGroupResults
      .filter((r) => r.tournamentGroupId === group.id)
      .map((r) => ({
        fixtureId: r.fixtureId,
        sideAParticipantId: r.sideAParticipantId,
        sideBParticipantId: r.sideBParticipantId,
        scoreSideA: r.scoreSideA,
        scoreSideB: r.scoreSideB,
      }));

    const { rows } = calculateTournamentGroupStandings({
      participantIds: group.participantIds,
      completedFixtures: fixtures,
      rankingConfiguration: input.rankingConfiguration,
    });

    return {
      groupId: group.id,
      groupLabel: group.label,
      rows: rows.map((row: GroupStandingRow) => ({
        position: row.position,
        participantId: row.participantId,
        displayName: nameById.get(row.participantId) ?? row.participantId,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
        points: row.points,
        tiedAtPosition: row.tiedAtPosition,
      })),
    };
  });
}
