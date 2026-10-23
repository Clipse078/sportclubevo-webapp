import { cumulativeShareBasisPoints } from "@/lib/finance/projection/projection-integer-math";
import type { ProjectionFinanceYearActualSeries } from "@/lib/finance/projection/projection-evidence-types";

/**
 * Dispersion of historical cumulative seasonal shares (basis points) through the same
 * relative period indexes as the current completed set.
 *
 * Thresholds (documented in SCE-FINANCE-04B-04-METHODOLOGY.md):
 * - spreadBp <= 1500 → stable
 * - spreadBp <= 3500 → moderate
 * - spreadBp > 3500 → volatile
 */
export type ProjectionPatternStabilityAssessment = {
  historicalYearCount: number;
  shareBasisPointsByYear: readonly number[];
  spreadBasisPoints: number | null;
  stability: "STABLE" | "MODERATE" | "VOLATILE" | "UNKNOWN";
};

export const PROJECTION_PATTERN_STABILITY_THRESHOLDS = {
  stableMaxSpreadBasisPoints: 1500,
  moderateMaxSpreadBasisPoints: 3500,
} as const;

function sumCompleteThroughIndexes(
  series: ProjectionFinanceYearActualSeries,
  relativeIndexes: ReadonlySet<number>,
): number {
  let sum = 0;
  for (const obs of series.observations) {
    if (
      relativeIndexes.has(obs.relativePeriodIndex) &&
      obs.completeness === "COMPLETE" &&
      obs.amountMinor !== null
    ) {
      sum += obs.amountMinor;
    }
  }
  return sum;
}

function annualTotalComplete(series: ProjectionFinanceYearActualSeries): number {
  let sum = 0;
  for (const obs of series.observations) {
    if (obs.completeness === "COMPLETE" && obs.amountMinor !== null) {
      sum += obs.amountMinor;
    }
  }
  return sum;
}

export function assessHistoricalPatternStability(input: {
  completedCurrentRelativeIndexes: ReadonlySet<number>;
  historicalSeries: readonly ProjectionFinanceYearActualSeries[];
}): ProjectionPatternStabilityAssessment {
  const shareBasisPointsByYear: number[] = [];
  for (const series of input.historicalSeries) {
    const annual = annualTotalComplete(series);
    if (annual <= 0) continue;
    const cumulative = sumCompleteThroughIndexes(series, input.completedCurrentRelativeIndexes);
    const bp = cumulativeShareBasisPoints(cumulative, annual);
    if (bp !== null) {
      shareBasisPointsByYear.push(bp);
    }
  }

  if (shareBasisPointsByYear.length < 2) {
    return {
      historicalYearCount: shareBasisPointsByYear.length,
      shareBasisPointsByYear,
      spreadBasisPoints: null,
      stability: shareBasisPointsByYear.length === 1 ? "MODERATE" : "UNKNOWN",
    };
  }

  const min = Math.min(...shareBasisPointsByYear);
  const max = Math.max(...shareBasisPointsByYear);
  const spread = max - min;
  let stability: ProjectionPatternStabilityAssessment["stability"] = "VOLATILE";
  if (spread <= PROJECTION_PATTERN_STABILITY_THRESHOLDS.stableMaxSpreadBasisPoints) {
    stability = "STABLE";
  } else if (spread <= PROJECTION_PATTERN_STABILITY_THRESHOLDS.moderateMaxSpreadBasisPoints) {
    stability = "MODERATE";
  }

  return {
    historicalYearCount: shareBasisPointsByYear.length,
    shareBasisPointsByYear,
    spreadBasisPoints: spread,
    stability,
  };
}
