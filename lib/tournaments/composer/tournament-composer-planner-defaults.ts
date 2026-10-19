import {
  DEFAULT_FOOTBALL_RANKING_POINTS,
  DEFAULT_FOOTBALL_TIEBREAK_ORDER,
} from "@/lib/tournament-scheduling/competition-structure/constants";
import { HOME_AWAY_DEFAULT_FOR_NEUTRAL_YOUTH_TOURNAMENT } from "@/lib/tournament-scheduling/smart-generator-architecture";
import { TOURNAMENT_ROUND_ROBIN_DEFAULT_MEETINGS_PER_OPPONENT } from "@/lib/tournament-scheduling/fixtures/constants";
import {
  FEASIBILITY_DEFAULT_MIN_REST_MINUTES,
  FEASIBILITY_DEFAULT_TRANSITION_MINUTES,
} from "@/lib/tournament-scheduling/feasibility/constants";
import type { TournamentComposerPlannerDraft } from "./tournament-composer-planner-types";

export function defaultTournamentComposerPitchLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Feld ${i + 1}`);
}

export function createDefaultTournamentComposerPlannerDraft(input?: {
  defaultMatchDurationMinutes?: number;
  initialPitchCount?: number;
}): TournamentComposerPlannerDraft {
  const pitchCount = input?.initialPitchCount ?? 1;
  const labels = defaultTournamentComposerPitchLabels(pitchCount);
  return {
    competitionFormat: "GROUP_MIX_ONLY",
    groupMixStrategy: "ROUND_ROBIN",
    meetingsPerOpponent: TOURNAMENT_ROUND_ROBIN_DEFAULT_MEETINGS_PER_OPPONENT,
    smartMixTargetMatchesPerParticipant: 4,
    homeAwayRelevance: HOME_AWAY_DEFAULT_FOR_NEUTRAL_YOUTH_TOURNAMENT,
    groupCount: 1,
    knockoutQualifiersPerGroup: 2,
    ranking: {
      winPoints: DEFAULT_FOOTBALL_RANKING_POINTS.winPoints,
      drawPoints: DEFAULT_FOOTBALL_RANKING_POINTS.drawPoints,
      lossPoints: DEFAULT_FOOTBALL_RANKING_POINTS.lossPoints,
      tiebreakOrder: [...DEFAULT_FOOTBALL_TIEBREAK_ORDER],
    },
    pitches: labels.map((label, index) => ({
      localId: `pitch-${index + 1}`,
      label,
      playersPerSide: null,
    })),
    timing: {
      matchDurationMinutes: input?.defaultMatchDurationMinutes ?? 12,
      transitionMinutes: FEASIBILITY_DEFAULT_TRANSITION_MINUTES,
      minRestMinutes: FEASIBILITY_DEFAULT_MIN_REST_MINUTES,
    },
    breaks: [],
    programmeTemplateId: null,
    programmeTemplateVersion: null,
    programmeProposalCategoryContext: null,
    programmeProposalFingerprint: null,
    pitchesUserCustomized: false,
    pendingProposalRefresh: null,
    mainPause: {
      enabled: false,
      durationMinutes: 10,
      startLocalTime: "",
    },
  };
}

export function resolveEffectiveGroupCount(planner: TournamentComposerPlannerDraft): number {
  if (planner.competitionFormat === "KNOCKOUT_ONLY") {
    return 1;
  }
  return Math.max(1, planner.groupCount);
}
