import type { ProjectionAccountCalculationResult } from "@/lib/finance/projection/projection-calculation-types";
import type { ProjectionEvidenceContext } from "@/lib/finance/projection/projection-evidence-types";
import {
  assessMethodologyEligibility,
  completedCurrentPeriodActualMinor,
  knownActualAmountMinor,
} from "@/lib/finance/projection/projection-methodology-eligibility";
import {
  cumulativeShareBasisPoints,
  medianOfIntegers,
  roundRationalToMinor,
} from "@/lib/finance/projection/projection-integer-math";
import { assessProjectionAccountConfidence } from "@/lib/finance/projection/projection-confidence";
import { PROJECTION_HISTORICAL_PATTERN_THRESHOLDS } from "@/lib/finance/projection/projection-methodology-eligibility";

function sumCompleteThroughIndexes(
  context: ProjectionEvidenceContext,
  relativeIndexes: ReadonlySet<number>,
  seriesId: string,
): number {
  const series =
    seriesId === context.financeYearId
      ? context.currentYearActuals
      : context.historicalActuals.find((s) => s.financeYearId === seriesId);
  if (!series) return 0;
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

function annualTotalComplete(
  context: ProjectionEvidenceContext,
  seriesId: string,
): number {
  const series =
    seriesId === context.financeYearId
      ? context.currentYearActuals
      : context.historicalActuals.find((s) => s.financeYearId === seriesId);
  if (!series) return 0;
  let sum = 0;
  for (const obs of series.observations) {
    if (obs.completeness === "COMPLETE" && obs.amountMinor !== null) {
      sum += obs.amountMinor;
    }
  }
  return sum;
}

export function calculateHistoricalPatternProjection(
  context: ProjectionEvidenceContext,
): ProjectionAccountCalculationResult | null {
  const eligibility = assessMethodologyEligibility(context);
  if (!eligibility.historicalPattern) return null;

  const indexes = eligibility.completedCurrentIndexes;
  const knownActual = knownActualAmountMinor(context);
  const completedActual = completedCurrentPeriodActualMinor(context);
  if (completedActual <= 0) return null;

  const shareBpList: number[] = [];
  const yearsUsed: string[] = [];
  const impliedAnnualByYear: number[] = [];

  for (const series of context.historicalActuals) {
    const annual = annualTotalComplete(context, series.financeYearId);
    if (annual <= 0) continue;
    const cumulative = sumCompleteThroughIndexes(context, indexes, series.financeYearId);
    const bp = cumulativeShareBasisPoints(cumulative, annual);
    if (bp === null) continue;
    shareBpList.push(bp);
    yearsUsed.push(series.financeYearId);
    impliedAnnualByYear.push(
      roundRationalToMinor(BigInt(completedActual) * BigInt(10000), BigInt(bp)),
    );
  }

  const medianBp = medianOfIntegers(shareBpList);
  if (
    medianBp === null ||
    medianBp < PROJECTION_HISTORICAL_PATTERN_THRESHOLDS.minMedianShareBasisPoints ||
    medianBp > PROJECTION_HISTORICAL_PATTERN_THRESHOLDS.maxMedianShareBasisPoints
  ) {
    return null;
  }

  let projectedAmountMinor = roundRationalToMinor(
    BigInt(completedActual) * BigInt(10000),
    BigInt(medianBp),
  );
  if (projectedAmountMinor < knownActual) {
    projectedAmountMinor = knownActual;
  }

  const estimatedRemaining =
    projectedAmountMinor >= knownActual ? projectedAmountMinor - knownActual : null;

  let lowerBoundMinor: number | null = null;
  let upperBoundMinor: number | null = null;
  if (impliedAnnualByYear.length >= 2) {
    lowerBoundMinor = Math.min(...impliedAnnualByYear);
    upperBoundMinor = Math.max(...impliedAnnualByYear);
    if (lowerBoundMinor < knownActual) lowerBoundMinor = knownActual;
    if (upperBoundMinor < knownActual) upperBoundMinor = knownActual;
  }

  const confidence = assessProjectionAccountConfidence({
    methodologyFamily: "HISTORICAL_PATTERN",
    context,
    patternStability: eligibility.patternStability,
    historicalYearsUsed: yearsUsed.length,
  });

  return {
    financialAccountId: context.financialAccountId,
    projectedAmountMinor,
    knownActualAmountMinor: knownActual,
    estimatedRemainingAmountMinor: estimatedRemaining,
    methodologyFamily: "HISTORICAL_PATTERN",
    dataSufficiency: context.sufficiency.level,
    sufficiencyReasons: context.sufficiency.reasonCodes,
    confidenceLevel: confidence.level,
    confidenceRationaleCodes: confidence.rationaleCodes,
    lowerBoundMinor,
    upperBoundMinor,
    reasonCodes: ["HISTORICAL_MEDIAN_SEASONAL_SHARE"],
    materialInfluences: [
      { code: "MEDIAN_CUMULATIVE_SHARE_BP", weight: medianBp },
      { code: "COMPLETED_CURRENT_PERIODS", weight: indexes.size },
    ],
    historicalFinanceYearIdsUsed: yearsUsed,
    completedCurrentPeriodCount: indexes.size,
  };
}
