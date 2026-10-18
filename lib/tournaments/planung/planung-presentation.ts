/**
 * German UX labels for Tournament Planung (no raw engine enums in primary copy).
 */

import type { TournamentFeasibilityStatus } from "@/lib/tournament-scheduling/feasibility";
import type {
  FeasibilityDiagnosticCode,
  FeasibilitySuggestionCode,
  TournamentFeasibilityResult,
} from "@/lib/tournament-scheduling/feasibility/types";
import type { TournamentScheduleOptimisationStatus } from "@/lib/tournament-scheduling/schedule-optimiser/types";
import type { TournamentFixtureScheduleLockDimension } from "@/lib/tournament-scheduling/types";
import type {
  TournamentPlanungFeasibilityGuidance,
  TournamentPlanungFeasibilityUxStatus,
  TournamentPlanungGenerationOutcome,
  TournamentPlanungRegenerationSummary,
} from "./types";
import type { RegenerationChangeMetrics } from "@/lib/tournament-scheduling/partial-regeneration/types";
import type { TournamentScheduleOptimisationResult } from "@/lib/tournament-scheduling/schedule-optimiser/types";

export function scheduleLockDimensionLabel(
  dimension: TournamentFixtureScheduleLockDimension,
): string {
  switch (dimension) {
    case "TIME":
      return "Zeit gesperrt";
    case "PITCH":
      return "Feld gesperrt";
    case "TIME_AND_PITCH":
      return "Zeit & Feld gesperrt";
    default:
      return "Gesperrt";
  }
}

export function scheduleLockActionLabel(
  dimension: TournamentFixtureScheduleLockDimension,
): string {
  switch (dimension) {
    case "TIME":
      return "Zeit sperren";
    case "PITCH":
      return "Feld sperren";
    case "TIME_AND_PITCH":
      return "Zeit & Feld sperren";
    default:
      return "Sperren";
  }
}

export function resolveFeasibilityUxStatus(input: {
  feasibility: TournamentFeasibilityStatus | null;
  optimisation: TournamentScheduleOptimisationStatus | null;
  hasAssignments: boolean;
}): TournamentPlanungFeasibilityUxStatus | null {
  if (!input.hasAssignments && input.feasibility === null) {
    return null;
  }
  if (input.optimisation === "INFEASIBLE_PROVEN" || input.feasibility === "INFEASIBLE") {
    return "CONFLICT";
  }
  if (input.optimisation === "UNRESOLVED" || !input.hasAssignments) {
    return "NOT_FULLY_PLANNABLE";
  }
  if (input.feasibility === "TIGHT") {
    return "WINDOW_TIGHT";
  }
  return "PLAN_FITS";
}

export function feasibilityUxHeadline(status: TournamentPlanungFeasibilityUxStatus): string {
  switch (status) {
    case "PLAN_FITS":
      return "Plan passt";
    case "WINDOW_TIGHT":
      return "Zeitfenster knapp";
    case "CONFLICT":
      return "Spielplan kann noch nicht erstellt werden";
    case "NOT_FULLY_PLANNABLE":
      return "Noch nicht vollständig planbar";
    default:
      return "Planungsstatus";
  }
}

export function feasibilityDiagnosticUserMessage(code: FeasibilityDiagnosticCode): string {
  switch (code) {
    case "CAPACITY.PITCH_MINUTES_SHORT":
    case "CAPACITY.WINDOW_TOO_SHORT":
      return "Das verfügbare Zeitfenster reicht für die geplanten Spiele und Spielfelder nicht aus.";
    case "CAPACITY.INSUFFICIENT_PARALLEL_PITCHES":
      return "Es fehlt parallele Spielfeld-Kapazität für die geplante Spielanzahl.";
    case "REST.CANNOT_SATISFY_MIN_REST":
      return "Der Spielplan kann die erforderlichen Erholungszeiten zwischen den Spielen aktuell nicht einhalten.";
    case "FIXTURE_SET.INVALID":
    case "FIXTURE_SET.EMPTY":
      return "Die Spielkonfiguration ist unvollständig oder ungültig.";
    case "PITCH.UNAVAILABLE":
      return "Mindestens ein Spielfeld ist im Zeitfenster nicht verfügbar.";
    case "SLOTS.TOO_MANY_CANDIDATES":
      return "Die Planung ist zu komplex für die verfügbare Zeit — bitte Turnierparameter anpassen.";
    case "LOCKS.CONFLICTING":
      return "Gesperrte Zeiten oder Felder widersprechen der aktuellen Konfiguration.";
    case "ASSIGNMENT.SEARCH_EXHAUSTED":
      return "Es konnte keine gültige Spielplan-Zuordnung gefunden werden.";
    case "LIMIT.PARTICIPANTS_EXCEEDED":
      return "Die Teilnehmeranzahl überschreitet die unterstützte Planungsgrenze.";
    case "LIMIT.FIXTURES_EXCEEDED":
      return "Die Spielanzahl überschreitet die unterstützte Planungsgrenze.";
    case "LIMIT.PITCHES_EXCEEDED":
      return "Die Spielfeldanzahl überschreitet die unterstützte Planungsgrenze.";
    case "BREAK.INVALID":
    case "BREAK.OUTSIDE_WINDOW":
    case "BREAK.UNKNOWN_PITCH":
      return "Pausen oder Sperrzeiten passen nicht zum Turnierzeitfenster.";
    default:
      return "Die aktuelle Turnierkonfiguration lässt sich nicht planen.";
  }
}

/** User-facing adjustment labels (no internal minimum-rest control). */
export function feasibilitySuggestionUserLabel(code: FeasibilitySuggestionCode): string {
  switch (code) {
    case "EXTEND_TOURNAMENT_WINDOW":
      return "Turnierzeit verlängern";
    case "ADD_TOURNAMENT_PITCH":
      return "Weiteres Spielfeld hinzufügen";
    case "REDUCE_MATCH_DURATION":
      return "Spieldauer verkürzen";
    case "REDUCE_TRANSITION_DURATION":
      return "Wechselzeit verkürzen";
    case "REDUCE_MINIMUM_REST":
      return "Spieldauer oder Wechselzeit verkürzen";
    default:
      return "Turnierkonfiguration anpassen";
  }
}

export function buildPlanungFeasibilityGuidance(
  feasibility: TournamentFeasibilityResult | null,
): TournamentPlanungFeasibilityGuidance | null {
  if (!feasibility || feasibility.status !== "INFEASIBLE") {
    return null;
  }

  const diagnosticMessages = feasibility.diagnostics.map((d) =>
    feasibilityDiagnosticUserMessage(d.code),
  );
  const uniqueDiagnostic = [...new Set(diagnosticMessages)];
  const summary =
    uniqueDiagnostic[0] ??
    "Das verfügbare Zeitfenster reicht für die aktuelle Turnierkonfiguration nicht aus.";

  const adjustmentLabels = feasibility.suggestions.map((s) =>
    feasibilitySuggestionUserLabel(s.code),
  );
  const adjustments = [...new Set(adjustmentLabels)];

  return {
    headline: "Spielplan kann noch nicht erstellt werden",
    summary,
    adjustments,
  };
}

export function resolveInitialScheduleGenerationOutcome(params: {
  optimisation: TournamentScheduleOptimisationResult;
  feasibility: TournamentFeasibilityResult | null;
}): TournamentPlanungGenerationOutcome {
  const succeeded =
    params.optimisation.status !== "INFEASIBLE_PROVEN" &&
    params.optimisation.assignments.length > 0;

  return {
    attempted: true,
    succeeded,
    optimisationStatus: params.optimisation.status,
    guidance: succeeded ? null : buildPlanungFeasibilityGuidance(params.feasibility),
  };
}

export function buildRegenerationSummaryMessage(
  metrics: RegenerationChangeMetrics | null | undefined,
): TournamentPlanungRegenerationSummary {
  if (!metrics) return null;
  const moved =
    metrics.fixturesMovedInBoth +
    metrics.fixturesMovedInTime +
    metrics.fixturesMovedInPitch;
  const pitchesChanged = metrics.fixturesMovedInPitch + metrics.fixturesMovedInBoth;
  const parts: string[] = [];
  if (moved > 0) {
    parts.push(`${moved} Spiele verschoben`);
  }
  if (pitchesChanged > 0) {
    parts.push(`${pitchesChanged} Feld geändert`);
  }
  if (metrics.unchangedFixtureCount > 0) {
    parts.push(`${metrics.unchangedFixtureCount} Spiele unverändert`);
  }
  if (parts.length === 0) {
    return {
      fixturesMoved: 0,
      pitchesChanged: 0,
      unchangedCount: metrics.unchangedFixtureCount,
      message: "Spielplan unverändert",
    };
  }
  return {
    fixturesMoved: moved,
    pitchesChanged,
    unchangedCount: metrics.unchangedFixtureCount,
    message: parts.join(" · "),
  };
}
