import type { ProjectionAccountCalculationResult } from "@/lib/finance/projection/projection-calculation-types";
import type { ProjectionEvidenceContext } from "@/lib/finance/projection/projection-evidence-types";
import { calculateHistoricalPatternProjection } from "@/lib/finance/projection/projection-historical-pattern";
import { calculateNoProjectionResult } from "@/lib/finance/projection/projection-no-projection";
import {
  assessMethodologyEligibility,
  selectProjectionMethodology,
} from "@/lib/finance/projection/projection-methodology-eligibility";
import { calculateRunRateProjection } from "@/lib/finance/projection/projection-run-rate";

export function calculateProjectionForAccount(
  context: ProjectionEvidenceContext,
): ProjectionAccountCalculationResult {
  const methodology = selectProjectionMethodology(context);

  if (methodology === "HISTORICAL_PATTERN") {
    const result = calculateHistoricalPatternProjection(context);
    if (result) return result;
  }

  const eligibility = assessMethodologyEligibility(context);
  if (eligibility.runRateEligible) {
    const runRate = calculateRunRateProjection(context);
    if (runRate) return runRate;
  }

  if (methodology === "RUN_RATE") {
    const runRate = calculateRunRateProjection(context);
    if (runRate) return runRate;
  }

  return calculateNoProjectionResult(context);
}
