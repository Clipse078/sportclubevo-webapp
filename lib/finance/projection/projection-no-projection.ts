import type { ProjectionAccountCalculationResult } from "@/lib/finance/projection/projection-calculation-types";
import type { ProjectionEvidenceContext } from "@/lib/finance/projection/projection-evidence-types";
import { knownActualAmountMinor } from "@/lib/finance/projection/projection-methodology-eligibility";

export function calculateNoProjectionResult(
  context: ProjectionEvidenceContext,
): ProjectionAccountCalculationResult {
  return {
    financialAccountId: context.financialAccountId,
    projectedAmountMinor: null,
    knownActualAmountMinor: knownActualAmountMinor(context),
    estimatedRemainingAmountMinor: null,
    methodologyFamily: "NONE",
    dataSufficiency: context.sufficiency.level,
    sufficiencyReasons: context.sufficiency.reasonCodes,
    confidenceLevel: "NONE",
    confidenceRationaleCodes: ["NO_PROJECTION"],
    lowerBoundMinor: null,
    upperBoundMinor: null,
    reasonCodes: ["NO_RELIABLE_PROJECTION"],
    materialInfluences: [],
    historicalFinanceYearIdsUsed: [],
    completedCurrentPeriodCount: context.sufficiency.metrics.currentYearCompletePeriodCount,
  };
}
