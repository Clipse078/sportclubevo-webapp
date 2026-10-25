/**
 * FIN-04E-07 — presentation-neutral visual timing read model types.
 */

import type { ExpectedEventTemporalPosition } from "@/lib/finance/forecast/classify-expected-event-temporal-position";
import type { ExpectedFinancialEventTimingPrecisionPersisted } from "@/lib/finance/forecast/expected-financial-event-persistence-validation";
import type {
  FinanceForecastTimingCoverage,
  FinanceForecastTimingInterpretationState,
  FinanceForecastTimingOverviewReadModel,
} from "@/lib/finance/forecast/finance-forecast-timing-read-model";

export type FinanceTimingVisualIntervalKind = "EXACT_DATE" | "MONTH" | "DATE_RANGE";

/** Business interval for plotting — not pixel coordinates. */
export type FinanceTimingVisualTimelineInterval = {
  kind: FinanceTimingVisualIntervalKind;
  startDateIso: string;
  endDateIso: string;
  /**
   * Internal axis anchor for chart libraries only.
   * Must not be shown as the expected business date for MONTH precision.
   */
  plotAnchorDateIso: string;
};

export type FinanceTimingVisualEventMarker = {
  eventId: string;
  financialAccountId: string;
  accountName: string;
  accountType: "INCOME" | "EXPENSE";
  expectedAmountMinor: number;
  timingPrecision: ExpectedFinancialEventTimingPrecisionPersisted;
  interval: FinanceTimingVisualTimelineInterval;
  temporalPositionAtCutoff: ExpectedEventTemporalPosition;
  isAfterFinanceYearEnd: boolean;
  /** Relative materiality 0–1 within the visible marker set (largest = 1). */
  materialityFraction: number;
  description: string | null;
  isManual: boolean;
};

export type FinanceTimingVisualUntimedTotals = {
  incomeMinor: number;
  expenseMinor: number;
  totalMinor: number;
};

export type FinanceTimingVisualWindow = {
  startDateIso: string;
  endDateIso: string;
  financeYearStartDateIso: string | null;
  financeYearEndDateIso: string | null;
  actualsThroughDateIso: string;
};

export type FinanceTimingVisualStructuredSummary = {
  futureTimedEventCount: number;
  ambiguousEventCount: number;
  incomeTimedMinor: number;
  expenseTimedMinor: number;
  untimedTotalMinor: number;
  isOverallocated: boolean;
};

export type FinanceForecastTimingVisualModel = {
  window: FinanceTimingVisualWindow;
  markers: FinanceTimingVisualEventMarker[];
  untimed: FinanceTimingVisualUntimedTotals;
  timingCoverage: FinanceForecastTimingCoverage;
  interpretationState: FinanceForecastTimingInterpretationState;
  remainingFutureExpectationMinor: number;
  timedFutureExpectationMinor: number;
  isOverallocated: boolean;
  hasRemainingExpectation: boolean;
  structuredSummary: FinanceTimingVisualStructuredSummary;
  /** Mirrors overview annual sides for companion copy — no recomputation in UI. */
  overviewAnnual: FinanceForecastTimingOverviewReadModel["annual"];
};
