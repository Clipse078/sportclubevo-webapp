import type { ProjectionMethodologyFamily } from "@/lib/finance/projection/projection-architecture-contract";
import type { ProjectionEvidenceContext } from "@/lib/finance/projection/projection-evidence-types";
import { assessHistoricalPatternStability } from "@/lib/finance/projection/projection-pattern-stability";

export const PROJECTION_HISTORICAL_PATTERN_THRESHOLDS = {
  minCompletedCurrentPeriods: 2,
  minHistoricalYearsWithShare: 1,
  minMedianShareBasisPoints: 500,
  maxMedianShareBasisPoints: 9500,
} as const;

export const PROJECTION_RUN_RATE_THRESHOLDS = {
  minCompletedCurrentPeriods: 2,
  /** Minimum elapsed finance-year days (inclusive cutoff) before run-rate is eligible. */
  minElapsedDays: 14,
  /** Minimum share of finance-year days elapsed (basis points). */
  minElapsedShareBasisPoints: 800,
} as const;

function completedCurrentRelativeIndexes(
  context: ProjectionEvidenceContext,
): Set<number> {
  const indexes = new Set<number>();
  for (const obs of context.currentYearActuals.observations) {
    if (obs.completeness === "COMPLETE" && obs.amountMinor !== null) {
      indexes.add(obs.relativePeriodIndex);
    }
  }
  return indexes;
}

export function knownActualAmountMinor(context: ProjectionEvidenceContext): number {
  let sum = 0;
  for (const obs of context.currentYearActuals.observations) {
    if (obs.amountMinor !== null) {
      sum += obs.amountMinor;
    }
  }
  return sum;
}

export function completedCurrentPeriodActualMinor(context: ProjectionEvidenceContext): number {
  let sum = 0;
  for (const obs of context.currentYearActuals.observations) {
    if (obs.completeness === "COMPLETE" && obs.amountMinor !== null) {
      sum += obs.amountMinor;
    }
  }
  return sum;
}

function parseUtcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function financeYearElapsedThroughCutoff(context: ProjectionEvidenceContext): {
  elapsedDays: number;
  totalDays: number;
} {
  const start = parseUtcDate(context.currentYearActuals.startDate);
  const end = parseUtcDate(context.currentYearActuals.endDate);
  const cutoff = parseUtcDate(context.actualsThroughDate);
  const totalMs = end.getTime() - start.getTime() + 86_400_000;
  const elapsedMs = Math.min(
    Math.max(cutoff.getTime() - start.getTime() + 86_400_000, 0),
    totalMs,
  );
  return {
    elapsedDays: Math.max(1, Math.round(elapsedMs / 86_400_000)),
    totalDays: Math.max(1, Math.round(totalMs / 86_400_000)),
  };
}

export type MethodologyEligibility = {
  historicalPattern: boolean;
  runRate: boolean;
  runRateEligible: boolean;
  noProjection: boolean;
  completedCurrentIndexes: ReadonlySet<number>;
  patternStability: ReturnType<typeof assessHistoricalPatternStability>;
  elapsedDays: number;
  totalFinanceYearDays: number;
};

export function assessMethodologyEligibility(
  context: ProjectionEvidenceContext,
): MethodologyEligibility {
  const completedCurrentIndexes = completedCurrentRelativeIndexes(context);
  const completedCount = completedCurrentIndexes.size;
  const { elapsedDays, totalDays } = financeYearElapsedThroughCutoff(context);

  const historicalWithEvidence = context.historicalActuals.filter((s) =>
    s.observations.some((o) => o.completeness === "COMPLETE" && o.amountMinor !== null),
  );

  const patternStability = assessHistoricalPatternStability({
    completedCurrentRelativeIndexes: completedCurrentIndexes,
    historicalSeries: historicalWithEvidence,
  });

  const historicalPattern =
    context.sufficiency.level !== "INSUFFICIENT" &&
    completedCount >= PROJECTION_HISTORICAL_PATTERN_THRESHOLDS.minCompletedCurrentPeriods &&
    patternStability.historicalYearCount >=
      PROJECTION_HISTORICAL_PATTERN_THRESHOLDS.minHistoricalYearsWithShare &&
    patternStability.stability !== "VOLATILE";

  const elapsedBp = Math.round((elapsedDays * 10000) / totalDays);
  const runRateEligible =
    context.sufficiency.level !== "INSUFFICIENT" &&
    completedCount >= PROJECTION_RUN_RATE_THRESHOLDS.minCompletedCurrentPeriods &&
    elapsedDays >= PROJECTION_RUN_RATE_THRESHOLDS.minElapsedDays &&
    elapsedBp >= PROJECTION_RUN_RATE_THRESHOLDS.minElapsedShareBasisPoints &&
    knownActualAmountMinor(context) > 0;

  const runRateSelected = runRateEligible && !historicalPattern;

  const noProjection =
    context.sufficiency.level === "INSUFFICIENT" || (!historicalPattern && !runRateEligible);

  return {
    historicalPattern,
    runRate: runRateSelected,
    runRateEligible,
    noProjection,
    completedCurrentIndexes,
    patternStability,
    elapsedDays,
    totalFinanceYearDays: totalDays,
  };
}

export function selectProjectionMethodology(
  context: ProjectionEvidenceContext,
): ProjectionMethodologyFamily {
  const eligibility = assessMethodologyEligibility(context);
  if (eligibility.noProjection) return "NONE";
  if (eligibility.historicalPattern) return "HISTORICAL_PATTERN";
  if (eligibility.runRateEligible) return "RUN_RATE";
  return "NONE";
}
