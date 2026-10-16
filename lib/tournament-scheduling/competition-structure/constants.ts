/**
 * SCE-TOURNAMENT-PLANNER-01E3A — canonical labels and defaults.
 */

import type { TournamentCompetitionFormat, TournamentRankingTiebreakCriterion } from "./types";

export const LEGACY_DEFAULT_STAGE_KEY = "MAIN";
export const LEGACY_DEFAULT_GROUP_MIX_LABEL = "Gruppen-/Mixspiele";
export const LEGACY_DEFAULT_KNOCKOUT_LABEL = "K.-o.-Phase";
export const LEGACY_DEFAULT_GROUP_PHASE_LABEL = "Gruppenphase";

export const DEFAULT_FOOTBALL_RANKING_POINTS = {
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
} as const;

export const DEFAULT_FOOTBALL_TIEBREAK_ORDER: readonly TournamentRankingTiebreakCriterion[] = [
  "POINTS",
  "GOAL_DIFFERENCE",
  "GOALS_SCORED",
  "HEAD_TO_HEAD",
];

export const FORMAT_PHASE_BLUEPRINT: Record<
  TournamentCompetitionFormat,
  readonly { phaseType: "GROUP_MIX" | "KNOCKOUT"; label: string; stageKey: string }[]
> = {
  GROUP_MIX_ONLY: [
    { phaseType: "GROUP_MIX", label: LEGACY_DEFAULT_GROUP_MIX_LABEL, stageKey: LEGACY_DEFAULT_STAGE_KEY },
  ],
  KNOCKOUT_ONLY: [
    { phaseType: "KNOCKOUT", label: LEGACY_DEFAULT_KNOCKOUT_LABEL, stageKey: LEGACY_DEFAULT_STAGE_KEY },
  ],
  GROUP_PLUS_KNOCKOUT: [
    { phaseType: "GROUP_MIX", label: LEGACY_DEFAULT_GROUP_PHASE_LABEL, stageKey: "GROUP" },
    { phaseType: "KNOCKOUT", label: LEGACY_DEFAULT_KNOCKOUT_LABEL, stageKey: "KO" },
  ],
};
