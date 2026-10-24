import type { ProjectionAccountCalculationResult } from "@/lib/finance/projection/projection-calculation-types";
import type { ProjectionEvidenceContext } from "@/lib/finance/projection/projection-evidence-types";
import {
  assessMethodologyEligibility,
  knownActualAmountMinor,
} from "@/lib/finance/projection/projection-methodology-eligibility";
import { roundRationalToMinor } from "@/lib/finance/projection/projection-integer-math";
import { assessProjectionAccountConfidence } from "@/lib/finance/projection/projection-confidence";

export function calculateRunRateProjection(
  context: ProjectionEvidenceContext,
): ProjectionAccountCalculationResult | null {
  const eligibility = assessMethodologyEligibility(context);
  if (!eligibility.runRateEligible) return null;

  const knownActual = knownActualAmountMinor(context);
  if (knownActual <= 0) return null;

  const { elapsedDays, totalFinanceYearDays } = eligibility;
  let projectedAmountMinor = roundRationalToMinor(
    BigInt(knownActual) * BigInt(totalFinanceYearDays),
    BigInt(elapsedDays),
  );
  if (projectedAmountMinor < knownActual) {
    projectedAmountMinor = knownActual;
  }

  const estimatedRemaining = projectedAmountMinor - knownActual;

  const confidence = assessProjectionAccountConfidence({
    methodologyFamily: "RUN_RATE",
    context,
    patternStability: eligibility.patternStability,
    historicalYearsUsed: 0,
  });

  return {
    financialAccountId: context.financialAccountId,
    projectedAmountMinor,
    knownActualAmountMinor: knownActual,
    estimatedRemainingAmountMinor: estimatedRemaining,
    methodologyFamily: "RUN_RATE",
    dataSufficiency: context.sufficiency.level,
    sufficiencyReasons: context.sufficiency.reasonCodes,
    confidenceLevel: confidence.level,
    confidenceRationaleCodes: confidence.rationaleCodes,
    lowerBoundMinor: null,
    upperBoundMinor: null,
    reasonCodes: ["RUN_RATE_ELAPSED_FINANCE_YEAR_DAYS"],
    materialInfluences: [
      { code: "ELAPSED_DAYS", weight: elapsedDays },
      { code: "TOTAL_FINANCE_YEAR_DAYS", weight: totalFinanceYearDays },
    ],
    historicalFinanceYearIdsUsed: [],
    completedCurrentPeriodCount: eligibility.completedCurrentIndexes.size,
  };
}
