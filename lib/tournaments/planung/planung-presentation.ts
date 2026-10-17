/**
 * German UX labels for Tournament Planung (no raw engine enums in primary copy).
 */

import type { TournamentFeasibilityStatus } from "@/lib/tournament-scheduling/feasibility";
import type { TournamentScheduleOptimisationStatus } from "@/lib/tournament-scheduling/schedule-optimiser/types";
import type { TournamentFixtureScheduleLockDimension } from "@/lib/tournament-scheduling/types";
import type {
  TournamentPlanungFeasibilityUxStatus,
  TournamentPlanungRegenerationSummary,
} from "./types";
import type { RegenerationChangeMetrics } from "@/lib/tournament-scheduling/partial-regeneration/types";

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
      return "Konflikt";
    case "NOT_FULLY_PLANNABLE":
      return "Noch nicht vollständig planbar";
    default:
      return "Planungsstatus";
  }
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
