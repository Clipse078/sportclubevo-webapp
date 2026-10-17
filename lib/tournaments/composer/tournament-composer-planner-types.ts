import type { TournamentCompetitionFormat } from "@/lib/tournament-scheduling/competition-structure/types";
import type { TournamentGroupMixGenerationStrategy } from "@/lib/tournament-scheduling/competition-structure/types";
import type { HomeAwayRelevance } from "@/lib/tournament-scheduling/smart-generator-architecture";
import type { TournamentRankingTiebreakCriterion } from "@/lib/tournament-scheduling/competition-structure/types";

export type TournamentComposerPitchDraft = {
  localId: string;
  label: string;
};

export type TournamentComposerBreakDraft = {
  localId: string;
  label: string;
  /** Wall-clock begin (HH:MM) on the tournament start date. */
  startLocalTime: string;
  durationMinutes: number;
  scope: "ALL_PITCHES" | "SELECTED_PITCHES";
  tournamentPitchLocalIds: string[];
  /** When false, breaks default to all tournament pitches (normal flow). */
  fieldSelectionAdvanced: boolean;
};

export type TournamentComposerTimingDraft = {
  matchDurationMinutes: number;
  transitionMinutes: number;
  minRestMinutes: number;
};

export type TournamentComposerRankingDraft = {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  tiebreakOrder: readonly TournamentRankingTiebreakCriterion[];
};

/** HOME tenant-organised tournaments only — omitted when homeAway = AWAY. */
export type TournamentComposerPlannerDraft = {
  competitionFormat: TournamentCompetitionFormat;
  groupMixStrategy: TournamentGroupMixGenerationStrategy;
  meetingsPerOpponent: number;
  smartMixTargetMatchesPerParticipant: number | null;
  homeAwayRelevance: HomeAwayRelevance;
  groupCount: number;
  knockoutQualifiersPerGroup: number;
  ranking: TournamentComposerRankingDraft;
  pitches: TournamentComposerPitchDraft[];
  timing: TournamentComposerTimingDraft;
  breaks: TournamentComposerBreakDraft[];
};

export function isHomePlannerConfiguration(
  homeAway: "HOME" | "AWAY",
): homeAway is "HOME" {
  return homeAway === "HOME";
}
