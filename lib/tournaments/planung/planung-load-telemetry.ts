/**
 * Development/test counters for Planung view-model load and scheduling paths.
 * Not used in production UX.
 */

export type PlanungLoadTelemetrySnapshot = {
  viewModelLoads: number;
  feasibilityAnalyses: number;
  smartTimingAssessments: number;
  optimiserInvocations: number;
};

const state: PlanungLoadTelemetrySnapshot = {
  viewModelLoads: 0,
  feasibilityAnalyses: 0,
  smartTimingAssessments: 0,
  optimiserInvocations: 0,
};

export function resetPlanungLoadTelemetry(): void {
  state.viewModelLoads = 0;
  state.feasibilityAnalyses = 0;
  state.smartTimingAssessments = 0;
  state.optimiserInvocations = 0;
}

export function snapshotPlanungLoadTelemetry(): PlanungLoadTelemetrySnapshot {
  return { ...state };
}

export function recordPlanungViewModelLoad(): void {
  state.viewModelLoads += 1;
}

export function recordPlanungFeasibilityAnalysis(): void {
  state.feasibilityAnalyses += 1;
}

export function recordPlanungSmartTimingAssessment(): void {
  state.smartTimingAssessments += 1;
}

export function recordPlanungOptimiserInvocation(): void {
  state.optimiserInvocations += 1;
}
