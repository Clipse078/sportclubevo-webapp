/**
 * SCE-TOURNAMENT-PLANNER-01E3A — competition topology domain types (pure).
 */

export type TournamentCompetitionFormat =
  | "GROUP_MIX_ONLY"
  | "KNOCKOUT_ONLY"
  | "GROUP_PLUS_KNOCKOUT";

export type TournamentPhaseType = "GROUP_MIX" | "KNOCKOUT";

export type TournamentGroupMixGenerationStrategy = "ROUND_ROBIN" | "SMART_MIX";

export type TournamentFixtureSideLabel = "A" | "B";

export type TournamentFixtureSideSourceType =
  | "CONCRETE_PARTICIPANT"
  | "QUALIFICATION_REFERENCE";

export type TournamentQualificationSourceType =
  | "GROUP_RANK"
  | "WINNER_OF_FIXTURE"
  | "LOSER_OF_FIXTURE";

export type TournamentRankingTiebreakCriterion =
  | "POINTS"
  | "GOAL_DIFFERENCE"
  | "GOALS_SCORED"
  | "HEAD_TO_HEAD";

export interface TournamentCompetitionConfigurationDefinition {
  id: string;
  eventId: string;
  competitionFormat: TournamentCompetitionFormat;
}

export interface TournamentPhaseDefinition {
  id: string;
  eventId: string;
  displayOrder: number;
  phaseType: TournamentPhaseType;
  label: string;
  stageKey: string;
  groupMixStrategy: TournamentGroupMixGenerationStrategy | null;
  smartMixTargetMatchesPerParticipant: number | null;
}

export interface TournamentGroupDefinition {
  id: string;
  eventId: string;
  tournamentPhaseId: string;
  displayOrder: number;
  label: string;
}

export interface TournamentGroupMembershipDefinition {
  id: string;
  eventId: string;
  tournamentGroupId: string;
  tournamentParticipantId: string;
}

export interface TournamentRankingConfigurationDefinition {
  id: string;
  eventId: string;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  tiebreakOrder: readonly TournamentRankingTiebreakCriterion[];
}

export interface TournamentQualificationSourceDefinition {
  id: string;
  eventId: string;
  sourceType: TournamentQualificationSourceType;
  sourceGroupId: string | null;
  rank: number | null;
  sourceFixtureId: string | null;
}

export interface TournamentFixtureSideDefinition {
  id: string;
  fixtureId: string;
  side: TournamentFixtureSideLabel;
  sourceType: TournamentFixtureSideSourceType;
  participantId: string | null;
  qualificationSourceId: string | null;
}

export interface ConcreteFixtureSideInput {
  kind: "CONCRETE_PARTICIPANT";
  participantId: string;
}

export interface QualificationFixtureSideInput {
  kind: "QUALIFICATION_REFERENCE";
  qualificationSourceId: string;
}

export type FixtureSideInput = ConcreteFixtureSideInput | QualificationFixtureSideInput;

export interface GroupRankQualificationInput {
  sourceType: "GROUP_RANK";
  sourceGroupId: string;
  rank: number;
}
