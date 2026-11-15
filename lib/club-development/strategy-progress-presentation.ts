import type { TargetMetricProgressInput } from "./target-outcome-progress";
import { computeTargetOutcomePercent } from "./target-outcome-progress";
import { CD_STRATEGY_PROGRESS_COPY } from "./strategy-progress-copy";

export { CD_STRATEGY_PROGRESS_COPY };

export function describeOutcomeProgressUnknown(
  metrics: TargetMetricProgressInput[],
): string | null {
  if (metrics.length === 0) {
    return CD_STRATEGY_PROGRESS_COPY.outcomeUnknownNoMetrics;
  }
  if (computeTargetOutcomePercent(metrics) !== null) return null;
  return CD_STRATEGY_PROGRESS_COPY.outcomeUnknownNotComputable;
}

export function describeDeliveryProgressUnknown(input: {
  linkedInitiativeCount: number;
  initiativesWithEligibleTasks: number;
}): string | null {
  if (input.linkedInitiativeCount === 0) {
    return CD_STRATEGY_PROGRESS_COPY.deliveryUnknownNoInitiatives;
  }
  if (input.initiativesWithEligibleTasks === 0) {
    return CD_STRATEGY_PROGRESS_COPY.deliveryUnknownNoEligibleTasks;
  }
  return null;
}