/**
 * FIN-04E-07R1 — state-sensitive timing workspace presentation (no domain semantics).
 */

export type FinanceForecastTimingWorkspacePresentationState =
  | "ZERO_TIMING"
  | "PARTIAL_TIMING"
  | "FULL_TIMING";

export type FinanceForecastTimingWorkspacePresentationContext =
  | FinanceForecastTimingWorkspacePresentationState
  | "NO_REMAINING";

export function deriveFinanceForecastTimingWorkspacePresentationState(input: {
  hasRemainingExpectation: boolean;
  timedFutureExpectationMinor: number;
  untimedTotalMinor: number;
  plottableMarkerCount: number;
}): FinanceForecastTimingWorkspacePresentationContext {
  if (!input.hasRemainingExpectation) {
    return "NO_REMAINING";
  }
  if (input.plottableMarkerCount === 0 && input.timedFutureExpectationMinor === 0) {
    return "ZERO_TIMING";
  }
  if (input.untimedTotalMinor <= 0) {
    return "FULL_TIMING";
  }
  return "PARTIAL_TIMING";
}

export function financeForecastTimingShowsUntimedCompanion(
  state: FinanceForecastTimingWorkspacePresentationContext,
): boolean {
  return state === "PARTIAL_TIMING";
}

export function financeForecastTimingUsesCompactEmptyTimeline(
  state: FinanceForecastTimingWorkspacePresentationContext,
): boolean {
  return state === "ZERO_TIMING";
}

export function financeForecastTimingShowsUpcomingMovements(input: {
  presentationState: FinanceForecastTimingWorkspacePresentationContext;
  upcomingEventCount: number;
  futureTimedEventCount: number;
}): boolean {
  if (input.presentationState === "ZERO_TIMING") {
    return false;
  }
  return input.upcomingEventCount > 0 || input.futureTimedEventCount > 0;
}

export function financeForecastTimingShowsAllEventsDisclosure(eventCount: number): boolean {
  return eventCount > 0;
}

export type FinanceForecastTimingAccountRowDensity = "ZERO_TIMED" | "PARTIAL_TIMED" | "ISSUE_FOCUS";

export function financeForecastTimingAccountRowDensity(input: {
  timedFutureExpectationMinor: number;
  unscheduledRemainderMinor: number | null;
}): FinanceForecastTimingAccountRowDensity {
  const open = input.unscheduledRemainderMinor ?? 0;
  const timed = input.timedFutureExpectationMinor;
  if (timed === 0 && open > 0) {
    return "ZERO_TIMED";
  }
  if (timed > 0 && open > 0) {
    return "PARTIAL_TIMED";
  }
  return "ISSUE_FOCUS";
}

export function financeForecastTimingSummaryShowsPartialInterpretation(input: {
  interpretationState: string;
  presentationState: FinanceForecastTimingWorkspacePresentationContext;
}): boolean {
  if (input.interpretationState !== "PARTIALLY_SCHEDULED") {
    return true;
  }
  return input.presentationState !== "ZERO_TIMING";
}

export function financeForecastTimingSummaryShowsGlobalCreateCta(input: {
  presentationState: FinanceForecastTimingWorkspacePresentationContext;
  canMutate: boolean;
  remainingMinor: number;
}): boolean {
  if (!input.canMutate || input.remainingMinor <= 0) {
    return false;
  }
  return input.presentationState !== "ZERO_TIMING";
}
