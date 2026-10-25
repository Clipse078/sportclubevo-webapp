/**
 * FIN-04E-02 — pure expected financial timing reconciliation engine.
 *
 * Current Forecast annual amount remains authority; expected events partition
 * remaining future expectation only (Actual through cutoff is not double-counted).
 */

import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import { classifyExpectedEventTemporalPosition } from "@/lib/finance/forecast/classify-expected-event-temporal-position";
import type {
  ReconcileExpectedFinancialTimingInput,
  ReconcileExpectedFinancialTimingResult,
} from "@/lib/finance/forecast/expected-financial-event-reconciliation-types";

function addMinor(total: number, delta: number): number {
  assertSafeAmountMinor(delta);
  const next = total + delta;
  if (!Number.isSafeInteger(next)) {
    throw new Error("FINANCE_AMOUNT_OVERFLOW");
  }
  return next;
}

function assertNonNegativeMagnitude(amountMinor: number, label: string): void {
  assertSafeAmountMinor(amountMinor);
  if (amountMinor < 0) {
    throw new Error(`FINANCE_EXPECTED_EVENT_INVALID_AMOUNT:${label}`);
  }
}

export function reconcileExpectedFinancialTiming(
  input: ReconcileExpectedFinancialTimingInput,
): ReconcileExpectedFinancialTimingResult {
  assertNonNegativeMagnitude(input.actualThroughCutoffMinor, "actualThroughCutoff");

  if (input.annualForecastAmountMinor !== null) {
    assertNonNegativeMagnitude(input.annualForecastAmountMinor, "annualForecast");
  }

  if (input.annualForecastAmountMinor === null) {
    return {
      annualForecastAmountMinor: null,
      actualThroughCutoffMinor: input.actualThroughCutoffMinor,
      actualsThroughDateIso: input.actualsThroughDateIso,
      remainingFutureExpectationMinor: null,
      timedFutureExpectationMinor: 0,
      ambiguousTimingExpectationMinor: 0,
      unscheduledRemainderMinor: null,
      overallocatedAmountMinor: null,
      actualExceedsAnnualForecastAmountMinor: null,
      state: "FORECAST_LINE_ABSENT",
    };
  }

  const annual = input.annualForecastAmountMinor;
  const actual = input.actualThroughCutoffMinor;

  const actualExceedsAnnualForecastAmountMinor =
    actual > annual ? actual - annual : null;

  const remainingFutureExpectationMinor = actual >= annual ? 0 : annual - actual;

  let timedFutureExpectationMinor = 0;
  let ambiguousTimingExpectationMinor = 0;

  for (const event of input.expectedEvents) {
    assertNonNegativeMagnitude(event.expectedAmountMinor, "expectedEvent");
    const position = classifyExpectedEventTemporalPosition(
      input.actualsThroughDateIso,
      event,
    );
    if (position === "FUTURE_TIMED") {
      timedFutureExpectationMinor = addMinor(
        timedFutureExpectationMinor,
        event.expectedAmountMinor,
      );
    } else if (position === "AMBIGUOUS_AT_CUTOFF") {
      ambiguousTimingExpectationMinor = addMinor(
        ambiguousTimingExpectationMinor,
        event.expectedAmountMinor,
      );
    }
  }

  const allocatedFutureMinor = addMinor(
    timedFutureExpectationMinor,
    ambiguousTimingExpectationMinor,
  );

  const unscheduledRemainderMinor =
    remainingFutureExpectationMinor - allocatedFutureMinor;

  let state: ReconcileExpectedFinancialTimingResult["state"];
  let overallocatedAmountMinor: number | null = null;

  if (unscheduledRemainderMinor < 0) {
    state = "OVERALLOCATED";
    overallocatedAmountMinor = -unscheduledRemainderMinor;
  } else if (unscheduledRemainderMinor > 0) {
    state = "UNSCHEDULED_REMAINDER";
  } else {
    state = "BALANCED";
  }

  return {
    annualForecastAmountMinor: annual,
    actualThroughCutoffMinor: actual,
    actualsThroughDateIso: input.actualsThroughDateIso,
    remainingFutureExpectationMinor,
    timedFutureExpectationMinor,
    ambiguousTimingExpectationMinor,
    unscheduledRemainderMinor: unscheduledRemainderMinor < 0 ? 0 : unscheduledRemainderMinor,
    overallocatedAmountMinor,
    actualExceedsAnnualForecastAmountMinor,
    state,
  };
}
