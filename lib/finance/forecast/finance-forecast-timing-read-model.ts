/**
 * FIN-04E-04 — presentation-neutral forecast timing read models.
 *
 * @see docs/finance/SCE-FINANCE-04E-04-FORECAST-TIMING-READ-MODEL.md
 */

import type { ExpectedFinancialEventRecord } from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import type { ExpectedFinancialTimingReconciliationState } from "@/lib/finance/forecast/expected-financial-event-reconciliation-types";
import type { ExpectedEventTemporalPosition } from "@/lib/finance/forecast/classify-expected-event-temporal-position";
import type { ExpectedFinancialEventTimingPrecisionPersisted } from "@/lib/finance/forecast/expected-financial-event-persistence-validation";

/** FIN-04E-04 architecture anchor (query / read layer). */
export const FINANCE_FORECAST_TIMING_FIN_04E_04_QUERY = {
  overviewQueryService: "loadFinanceForecastTimingOverview",
  eventDetailQueryService: "loadFinanceExpectedFinancialEventDetail",
  upcomingDefaultLimit: 10,
} as const;

/** Machine-testable locks introduced with FIN-04E-04 read models. */
export const EXPECTED_FINANCIAL_EVENT_04E_04_ARCHITECTURE_LOCKS = {
  TIMING_READ_MODEL_IS_PRESENTATION_NEUTRAL: true,
  ACCOUNTS_WITHOUT_EVENTS_REMAIN_VISIBLE: true,
  EMPTY_EVENTS_MEANS_UNSCHEDULED_NOT_NO_DATA: true,
  INCOME_AND_EXPENSE_REMAIN_DISTINCT: true,
  AMBIGUOUS_TIMING_REMAINS_DISTINCT: true,
  OVERALLOCATION_IS_EXPLICIT: true,
  MISSING_FORECAST_LINE_IS_EXPLICIT: true,
  NO_DOUBLE_COUNTING_OF_EXPECTED_EVENTS: true,
  UPCOMING_SORT_DOES_NOT_CHANGE_TIMING_PRECISION: true,
  NO_HARDCODED_MATERIALITY_THRESHOLD: true,
  READ_MODEL_USES_CURRENT_FORECAST_POINTER: true,
  READ_MODEL_USES_EXPLICIT_FINANCIAL_REFERENCE_DATE: true,
  READ_MODEL_DOES_NOT_IMPLEMENT_LIQUIDITY: true,
} as const;

export const FINANCE_FORECAST_TIMING_INTERPRETATION_STATES = [
  "OVERALLOCATED",
  "ATTENTION_REQUIRED",
  "PARTIALLY_SCHEDULED",
  "FULLY_SCHEDULED",
  "NO_REMAINING_EXPECTATION",
] as const;

export type FinanceForecastTimingInterpretationState =
  (typeof FINANCE_FORECAST_TIMING_INTERPRETATION_STATES)[number];

export const FINANCE_FORECAST_TIMING_EXCEPTION_KINDS = [
  "OVERALLOCATED",
  "AMBIGUOUS_AT_CUTOFF",
  "FORECAST_LINE_MISSING",
  "UNSCHEDULED_REMAINDER",
] as const;

export type FinanceForecastTimingExceptionKind =
  (typeof FINANCE_FORECAST_TIMING_EXCEPTION_KINDS)[number];

export type FinanceForecastTimingSideTotals = {
  annualForecastMinor: number;
  actualThroughCutoffMinor: number;
  remainingFutureExpectationMinor: number;
  timedFutureExpectationMinor: number;
  ambiguousTimingExpectationMinor: number;
  unscheduledRemainderMinor: number;
  overallocatedAmountMinor: number;
  actualExceedsAnnualForecastAmountMinor: number;
  /** Expected incoming/outgoing profile (timing evidence — not liquidity). */
  futureTimedMovementMinor: number;
};

export type FinanceForecastTimingCoverage =
  | { kind: "NO_REMAINING_EXPECTATION" }
  | { kind: "NOT_COMPUTABLE"; reason: "NO_CURRENT_FORECAST" | "MISSING_ANNUAL_LINES" }
  | {
      kind: "RATIO";
      remainingFutureExpectationMinor: number;
      timedFutureExpectationMinor: number;
      /** Basis points (10000 = 100%). Capped at 10000 when overallocated. */
      timedCoverageBasisPoints: number;
      /** Uncapped timed÷remaining in basis points when timed exceeds remaining. */
      rawTimedCoverageBasisPoints: number | null;
      isOverallocated: boolean;
    };

export type FinanceForecastTimingCurrentForecastContext =
  | { kind: "UNAVAILABLE" }
  | {
      kind: "AVAILABLE";
      forecastId: string;
      forecastVersionId: string;
      versionNumber: number;
      asOfDateIso: string | null;
      actualsThroughDateIso: string | null;
    };

export type FinanceForecastTimingException = {
  kind: FinanceForecastTimingExceptionKind;
  financialAccountId: string | null;
  amountMinor: number;
  eventCount: number | null;
  attentionPriority: number;
};

export type FinanceForecastTimingAccountPresentation = {
  financialAccountId: string;
  name: string;
  accountType: "INCOME" | "EXPENSE";
  lifecycle: "ACTIVE" | "ARCHIVED";
};

export type FinanceForecastTimingAccountReconciliation = {
  annualForecastAmountMinor: number | null;
  forecastLinePresent: boolean;
  actualThroughCutoffMinor: number;
  remainingFutureExpectationMinor: number | null;
  timedFutureExpectationMinor: number;
  ambiguousTimingExpectationMinor: number;
  unscheduledRemainderMinor: number | null;
  overallocatedAmountMinor: number | null;
  actualExceedsAnnualForecastAmountMinor: number | null;
  state: ExpectedFinancialTimingReconciliationState;
};

export type FinanceForecastTimingAccountReadModel = FinanceForecastTimingAccountPresentation & {
  rank: number;
  reconciliation: FinanceForecastTimingAccountReconciliation;
  expectedEventCount: number;
  futureTimedEventCount: number;
  ambiguousEventCount: number;
  nextExpectedEventId: string | null;
};

export type FinanceExpectedFinancialEventSourcePresentation = {
  sourceKind: ExpectedFinancialEventRecord["sourceKind"];
  isManual: boolean;
  hasExternalSourceReference: boolean;
};

export type FinanceExpectedFinancialEventReadModel = ExpectedFinancialEventRecord & {
  accountType: "INCOME" | "EXPENSE";
  sourcePresentation: FinanceExpectedFinancialEventSourcePresentation;
  temporalPositionAtCutoff: ExpectedEventTemporalPosition;
};

export type FinanceForecastTimingUpcomingEventReadModel = {
  eventId: string;
  financialAccountId: string;
  accountType: "INCOME" | "EXPENSE";
  accountName: string;
  expectedAmountMinor: number;
  timingPrecision: ExpectedFinancialEventTimingPrecisionPersisted;
  expectedDateIso: string | null;
  expectedMonthStartIso: string | null;
  rangeStartDateIso: string | null;
  rangeEndDateIso: string | null;
  sourcePresentation: FinanceExpectedFinancialEventSourcePresentation;
  description: string | null;
  rank: number;
};

export type FinanceForecastTimingCounts = {
  totalExpectedEventCount: number;
  futureTimedEventCount: number;
  ambiguousEventCount: number;
  accountsWithUnscheduledRemainderCount: number;
  overallocatedAccountCount: number;
  accountCount: number;
};

export type FinanceForecastTimingOverviewReadModel = {
  financeYearId: string;
  actualsThroughDateIso: string;
  referenceDateIso: string;
  currentForecast: FinanceForecastTimingCurrentForecastContext;
  annual: {
    income: FinanceForecastTimingSideTotals;
    expense: FinanceForecastTimingSideTotals;
    resultMinor: number;
    futureResultContextMinor: number;
  };
  timingCoverage: FinanceForecastTimingCoverage;
  interpretationState: FinanceForecastTimingInterpretationState;
  exceptions: FinanceForecastTimingException[];
  counts: FinanceForecastTimingCounts;
  accounts: FinanceForecastTimingAccountReadModel[];
  upcomingEvents: FinanceForecastTimingUpcomingEventReadModel[];
};
