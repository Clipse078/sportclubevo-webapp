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
  void input;
  /** FIN-04E-07R5 — per-account "Zeitpunkt hinzufügen" is the primary workflow; global create adds selection friction. */
  return false;
}

/** FIN-04E-07R5 — analytical movement chart is reusable intelligence, not Zeitplanung UI. */
export function financeForecastTimingWorkspaceMountsMovementChart(
  _state: FinanceForecastTimingWorkspacePresentationContext,
): boolean {
  return false;
}

export function financeForecastTimingShowsCompactUntimedOrientation(input: {
  presentationState: FinanceForecastTimingWorkspacePresentationContext;
  untimedTotalMinor: number;
}): boolean {
  return input.presentationState === "PARTIAL_TIMING" && input.untimedTotalMinor > 0;
}

export function financeForecastTimingShowsZeroTimingInterpretation(
  state: FinanceForecastTimingWorkspacePresentationContext,
): boolean {
  return state === "ZERO_TIMING";
}

export function financeForecastTimingShowsFullTimingCompletion(
  state: FinanceForecastTimingWorkspacePresentationContext,
): boolean {
  return state === "FULL_TIMING";
}

export function financeForecastTimingShowsOpenPlanningSection(input: {
  presentationState: FinanceForecastTimingWorkspacePresentationContext;
  attentionAccountCount: number;
}): boolean {
  if (input.presentationState === "NO_REMAINING") {
    return false;
  }
  if (input.presentationState === "FULL_TIMING" && input.attentionAccountCount === 0) {
    return false;
  }
  return true;
}

/** FIN-04E-07R2 — zero interpretation is not an action surface; account rows own create CTAs. */
export function financeForecastTimingCompactEmptyShowsGlobalCreateCta(
  state: FinanceForecastTimingWorkspacePresentationContext,
): boolean {
  if (state === "ZERO_TIMING") {
    return false;
  }
  return false;
}

export function financeForecastTimingCompactEmptyShowsPlottingSkeleton(
  state: FinanceForecastTimingWorkspacePresentationContext,
): boolean {
  return state !== "ZERO_TIMING";
}
