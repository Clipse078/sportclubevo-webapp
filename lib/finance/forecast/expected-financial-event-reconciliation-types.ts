/**
 * FIN-04E-02 — pure reconciliation input/output types (no Prisma).
 */

import type { ExpectedFinancialEventTimingPrecisionPersisted } from "@/lib/finance/forecast/expected-financial-event-persistence-validation";

export const EXPECTED_FINANCIAL_TIMING_RECONCILIATION_STATES = [
  "BALANCED",
  "UNSCHEDULED_REMAINDER",
  "OVERALLOCATED",
  "FORECAST_LINE_ABSENT",
] as const;

export type ExpectedFinancialTimingReconciliationState =
  (typeof EXPECTED_FINANCIAL_TIMING_RECONCILIATION_STATES)[number];

/** Minimal event shape for pure reconciliation — persistence layer maps rows to this. */
export type ExpectedFinancialEventForReconciliation = {
  expectedAmountMinor: number;
  timingPrecision: ExpectedFinancialEventTimingPrecisionPersisted;
  expectedDateIso?: string | null;
  expectedMonthStartIso?: string | null;
  rangeStartDateIso?: string | null;
  rangeEndDateIso?: string | null;
};

export type ReconcileExpectedFinancialTimingInput = {
  /** Full-year current forecast amount for the account — `null` when line absent (not coerced to zero). */
  annualForecastAmountMinor: number | null;
  /** Sum of actual entries through inclusive cutoff (positive magnitude per account). */
  actualThroughCutoffMinor: number;
  /** Explicit financial cutoff — must not be derived from system clock inside the engine. */
  actualsThroughDateIso: string;
  expectedEvents: ReadonlyArray<ExpectedFinancialEventForReconciliation>;
};

export type ReconcileExpectedFinancialTimingResult = {
  annualForecastAmountMinor: number | null;
  actualThroughCutoffMinor: number;
  actualsThroughDateIso: string;
  remainingFutureExpectationMinor: number | null;
  timedFutureExpectationMinor: number;
  ambiguousTimingExpectationMinor: number;
  unscheduledRemainderMinor: number | null;
  overallocatedAmountMinor: number | null;
  /** Positive magnitude when actual through cutoff exceeds annual forecast (no silent negative remainder). */
  actualExceedsAnnualForecastAmountMinor: number | null;
  state: ExpectedFinancialTimingReconciliationState;
};
