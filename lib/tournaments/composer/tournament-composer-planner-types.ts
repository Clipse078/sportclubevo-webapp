import type { TournamentCompetitionFormat } from "@/lib/tournament-scheduling/competition-structure/types";
import type { TournamentGroupMixGenerationStrategy } from "@/lib/tournament-scheduling/competition-structure/types";
import type { HomeAwayRelevance } from "@/lib/tournament-scheduling/smart-generator-architecture";
import type { TournamentRankingTiebreakCriterion } from "@/lib/tournament-scheduling/competition-structure/types";
import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";

export type TournamentComposerPitchDraft = {
  localId: string;
  label: string;
  /** Optional players per side — omitted/null = unspecified (02B). */
  playersPerSide?: number | null;
  /** When set, pitch row originates from a predefined programme template field. */
  templateFieldKey?: string;
  userLabelCustomized?: boolean;
};

/** @deprecated R11 — migrated to scheduleRoundBreaks on hydrate; do not use in UX. */
export type TournamentComposerMainPauseDraft = {
  enabled: boolean;
  durationMinutes: number;
  /** Wall-clock begin (HH:MM) on the tournament start date. */
  startLocalTime: string;
  /** Legacy round-based pause hint — migrated to scheduleRoundBreaks when present. */
  afterRoundNumber?: number;
};

/** Canonical Spielplan pauses — after round N, duration in minutes (0:n). */
export type TournamentComposerScheduleRoundBreakDraft = {
  localId: string;
  afterRoundNumber: number;
  durationMinutes: number;
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
  /** Resolved predefined programme template (02D) — null when TP01 fallback applies. */
  programmeTemplateId?: string | null;
  programmeTemplateVersion?: number | null;
  /** Last resolved category used for proposals — internal, not shown in UI. */
  programmeProposalCategoryContext?: ProgrammeTemplateCategoryContext | null;
  /** Fingerprint of category + participant count + template identity at last proposal apply. */
  programmeProposalFingerprint?: string | null;
  /** User edited pitch rows after proposal materialisation. */
  pitchesUserCustomized?: boolean;
  /** Material upstream change while pitches are customised — requires explicit user decision. */
  pendingProposalRefresh?: {
    message: string;
    nextFingerprint: string;
    nextTemplateId: string | null;
    nextTemplateVersion: number | null;
  } | null;
  /** Canonical round-bound pauses on Spielplan step (0:n). */
  scheduleRoundBreaks?: TournamentComposerScheduleRoundBreakDraft[];
  /** @deprecated R11 — use scheduleRoundBreaks. */
  mainPause?: TournamentComposerMainPauseDraft;
};

export function isHomePlannerConfiguration(
  homeAway: "HOME" | "AWAY",
): homeAway is "HOME" {
  return homeAway === "HOME";
}
