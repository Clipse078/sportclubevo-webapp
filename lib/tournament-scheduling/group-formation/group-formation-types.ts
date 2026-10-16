import type { TournamentGroupMixGenerationStrategy } from "../competition-structure/types";
import type { TournamentFixtureDefinition } from "../types";
import type { TournamentGroupDefinition, TournamentGroupMembershipDefinition } from "../competition-structure/types";

export interface FormTournamentGroupsInput {
  tournamentId: string;
  phaseId: string;
  participantIds: readonly string[];
  groupCount: number;
}

export interface GroupFormationDiagnostics {
  participantCount: number;
  groupCount: number;
  groupSizes: readonly number[];
  minGroupSize: number;
  maxGroupSize: number;
  algorithm: string;
  balancingDimension: "PARTICIPANT_COUNT_ONLY";
}

export interface FormTournamentGroupsResult {
  groups: TournamentGroupDefinition[];
  memberships: TournamentGroupMembershipDefinition[];
  diagnostics: GroupFormationDiagnostics;
}

export interface GenerateTournamentGroupFixturesInput {
  tournamentId: string;
  phaseId: string;
  /** When omitted, uses phase.groupMixStrategy (must be configured). */
  strategy?: TournamentGroupMixGenerationStrategy;
  meetingsPerOpponent?: number;
  targetMatchesPerParticipant?: number;
  homeAwayRelevance?: import("../smart-generator-architecture").HomeAwayRelevance;
}

export interface GroupFixtureDiagnostics {
  fixtureCount: number;
  fixtureCountByGroup: Readonly<Record<string, number>>;
  strategy: TournamentGroupMixGenerationStrategy;
  uniquePairCountByGroup?: Readonly<Record<string, number>>;
  repeatedPairCountByGroup?: Readonly<Record<string, number>>;
  maxPairMultiplicityByGroup?: Readonly<Record<string, number>>;
}

export interface GenerateTournamentGroupFixturesResult {
  fixtures: TournamentFixtureDefinition[];
  diagnostics: GroupFixtureDiagnostics;
}

export interface FormTournamentGroupsAndGenerateFixturesInput extends FormTournamentGroupsInput {
  strategy?: TournamentGroupMixGenerationStrategy;
  meetingsPerOpponent?: number;
  targetMatchesPerParticipant?: number;
  homeAwayRelevance?: import("../smart-generator-architecture").HomeAwayRelevance;
}

export interface FormTournamentGroupsAndGenerateFixturesResult {
  formation: FormTournamentGroupsResult;
  fixtures: GenerateTournamentGroupFixturesResult;
}
