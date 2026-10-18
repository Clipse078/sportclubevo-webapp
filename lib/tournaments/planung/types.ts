/**
 * SCE-TOURNAMENT-PLANNER-01H — Tournament Planung presentation view model.
 */

import type { TournamentFeasibilityStatus } from "@/lib/tournament-scheduling/feasibility";
import type { TournamentScheduleOptimisationStatus } from "@/lib/tournament-scheduling/schedule-optimiser/types";
import type { TournamentFixtureScheduleLockDimension } from "@/lib/tournament-scheduling/types";
import type { TournamentPlannerOwnershipResolution } from "@/lib/tournament-scheduling/planner-eligibility";

export type TournamentPlanungAvailability =
  | "AVAILABLE"
  | "UNAVAILABLE_EXTERNALLY_ORGANISED"
  | "UNAVAILABLE_UNKNOWN_OWNERSHIP";

export type TournamentPlanungSchedulePresence = "NONE" | "PARTIAL" | "COMPLETE";

export type TournamentPlanungFeasibilityUxStatus =
  | "PLAN_FITS"
  | "WINDOW_TIGHT"
  | "CONFLICT"
  | "NOT_FULLY_PLANNABLE";

export type TournamentPlanungPitchColumn = {
  pitchId: string;
  displayOrder: number;
  label: string;
};

export type TournamentPlanungTimeScale = {
  /** ISO instants — board row anchors (match starts + break starts). */
  rowAnchorsUtc: readonly string[];
  matchDurationMinutes: number;
  transitionMinutes: number;
  windowStartUtc: string;
  windowEndUtc: string;
};

export type TournamentPlanungParticipantIdentity = {
  participantId: string;
  displayName: string;
  crestUrl: string | null;
  accessibleLabel: string;
};

export type TournamentPlanungFixtureSidePresentation = {
  label: string;
  crestUrl: string | null;
  isPlaceholder: boolean;
  participantId: string | null;
  /** Qualification provenance when side is resolved but sourced from progression. */
  qualificationProvenanceLabel: string | null;
};

export type TournamentPlanungFixtureResultPresentation = {
  state: "UNPLAYED" | "COMPLETED";
  scoreSideA: number | null;
  scoreSideB: number | null;
  winnerParticipantId: string | null;
  revision: number;
};

export type TournamentPlanungFixtureBlock = {
  kind: "FIXTURE";
  fixtureId: string;
  assignmentId: string | null;
  sideA: TournamentPlanungFixtureSidePresentation;
  sideB: TournamentPlanungFixtureSidePresentation;
  startUtc: string;
  endUtc: string;
  pitchId: string;
  phaseLabel: string | null;
  groupLabel: string | null;
  phaseType: "GROUP_MIX" | "KNOCKOUT" | null;
  lockDimension: TournamentFixtureScheduleLockDimension | null;
  accessibleLabel: string;
  result: TournamentPlanungFixtureResultPresentation | null;
  canEnterResult: boolean;
};

export type TournamentPlanungGroupStandingsRow = {
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
};

export type TournamentPlanungGroupStandingsSection = {
  groupId: string;
  groupLabel: string;
  rows: readonly TournamentPlanungGroupStandingsRow[];
};

export type TournamentPlanungBreakBlock = {
  kind: "BREAK";
  breakId: string;
  label: string;
  startUtc: string;
  endUtc: string;
  pitchIds: readonly string[];
  scope: "ALL_PITCHES" | "SELECTED_PITCHES";
  accessibleLabel: string;
};

export type TournamentPlanungBoardCell =
  | TournamentPlanungFixtureBlock
  | TournamentPlanungBreakBlock;

export type TournamentPlanungScheduleSection = {
  sectionId: string;
  title: string;
  entries: readonly TournamentPlanungBoardCell[];
};

export type TournamentPlanungDiagnostic = {
  id: string;
  message: string;
  severity: "info" | "warning" | "danger";
};

export type TournamentPlanungSmartTimingSummary = {
  headline: string;
  detailLines: readonly string[];
  predictedEndUtc: string | null;
  reserveMinutes: number | null;
};

export type TournamentPlanungRegenerationSummary = {
  fixturesMoved: number;
  pitchesChanged: number;
  unchangedCount: number;
  message: string;
} | null;

export type TournamentPlanungIncompleteItem = {
  code: string;
  label: string;
  href: string | null;
};

export type TournamentPlanungActions = {
  canGenerate: boolean;
  canRegenerate: boolean;
  generateLabel: string;
  regenerateLabel: string;
  regenerateHint: string;
};

export type TournamentPlanungViewModel = {
  tournamentId: string;
  availability: TournamentPlanungAvailability;
  ownership: TournamentPlannerOwnershipResolution;
  scheduleVersionId: string | null;
  scheduleRevision: number | null;
  schedulePresence: TournamentPlanungSchedulePresence;
  optimisationStatus: TournamentScheduleOptimisationStatus | null;
  feasibilityStatus: TournamentFeasibilityStatus | null;
  feasibilityUxStatus: TournamentPlanungFeasibilityUxStatus | null;
  pitches: readonly TournamentPlanungPitchColumn[];
  timeScale: TournamentPlanungTimeScale | null;
  cells: readonly TournamentPlanungBoardCell[];
  /** Round / phase grouped schedule (assigned fixtures + breaks). */
  scheduleSections: readonly TournamentPlanungScheduleSection[];
  /** Chronological mobile list — same cells, grouped order. */
  mobileTimeline: readonly TournamentPlanungBoardCell[];
  smartTiming: TournamentPlanungSmartTimingSummary | null;
  diagnostics: readonly TournamentPlanungDiagnostic[];
  regenerationSummary: TournamentPlanungRegenerationSummary;
  incompleteSetup: readonly TournamentPlanungIncompleteItem[];
  actions: TournamentPlanungActions;
  groupStandings: readonly TournamentPlanungGroupStandingsSection[];
};
