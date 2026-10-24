/**
 * FIN-04E-02 — pure validation for FinanceExpectedFinancialEvent persistence shape.
 */

import type {
  FinanceExpectedFinancialEventSourceKind,
  FinanceExpectedFinancialEventTimingPrecision,
} from "@prisma/client";
import { parseFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

export const EXPECTED_FINANCIAL_EVENT_TIMING_PRECISION_PERSISTED = [
  "EXACT_DATE",
  "MONTH",
  "DATE_RANGE",
] as const;

export type ExpectedFinancialEventTimingPrecisionPersisted =
  (typeof EXPECTED_FINANCIAL_EVENT_TIMING_PRECISION_PERSISTED)[number];

export type ExpectedFinancialEventPersistenceInput = {
  tenantId: string;
  financeYearId: string;
  financialAccountId: string;
  expectedAmountMinor: number;
  timingPrecision: ExpectedFinancialEventTimingPrecisionPersisted;
  expectedDateIso?: string | null;
  expectedMonthStartIso?: string | null;
  rangeStartDateIso?: string | null;
  rangeEndDateIso?: string | null;
  sourceKind?: FinanceExpectedFinancialEventSourceKind;
  sourceRefType?: string | null;
  sourceRefId?: string | null;
  description?: string | null;
};

export type ValidatedExpectedFinancialEventPersistence = {
  tenantId: string;
  financeYearId: string;
  financialAccountId: string;
  expectedAmountMinor: number;
  timingPrecision: FinanceExpectedFinancialEventTimingPrecision;
  expectedDateIso: string | null;
  expectedMonthStartIso: string | null;
  rangeStartDateIso: string | null;
  rangeEndDateIso: string | null;
  sourceKind: FinanceExpectedFinancialEventSourceKind;
  sourceRefType: string | null;
  sourceRefId: string | null;
  description: string | null;
};

function isPersistedTimingPrecision(
  value: string,
): value is ExpectedFinancialEventTimingPrecisionPersisted {
  return (EXPECTED_FINANCIAL_EVENT_TIMING_PRECISION_PERSISTED as readonly string[]).includes(
    value,
  );
}

function assertFirstOfMonth(iso: string, label: string): void {
  const day = iso.slice(8, 10);
  if (day !== "01") {
    throw new Error(`FINANCE_EXPECTED_EVENT_INVALID_TIMING:${label}_must_be_first_of_month`);
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null || value.trim().length === 0) return null;
  return value.trim();
}

export function validateExpectedFinancialEventPersistence(
  input: ExpectedFinancialEventPersistenceInput,
): ValidatedExpectedFinancialEventPersistence {
  if (!input.tenantId?.trim()) {
    throw new Error("FINANCE_EXPECTED_EVENT_INVALID_TENANT");
  }
  if (!input.financeYearId?.trim()) {
    throw new Error("FINANCE_EXPECTED_EVENT_INVALID_FINANCE_YEAR");
  }
  if (!input.financialAccountId?.trim()) {
    throw new Error("FINANCE_EXPECTED_EVENT_INVALID_ACCOUNT");
  }
  if (!isPersistedTimingPrecision(input.timingPrecision)) {
    throw new Error("FINANCE_EXPECTED_EVENT_INVALID_TIMING_PRECISION");
  }

  assertSafeAmountMinor(input.expectedAmountMinor);
  if (input.expectedAmountMinor < 0) {
    throw new Error("FINANCE_EXPECTED_EVENT_INVALID_AMOUNT");
  }

  const sourceKind = input.sourceKind ?? "MANUAL";
  if (sourceKind !== "MANUAL") {
    throw new Error("FINANCE_EXPECTED_EVENT_INVALID_SOURCE");
  }

  const sourceRefType = normalizeOptionalText(input.sourceRefType);
  const sourceRefId = normalizeOptionalText(input.sourceRefId);
  if ((sourceRefType == null) !== (sourceRefId == null)) {
    throw new Error("FINANCE_EXPECTED_EVENT_INVALID_SOURCE_REFERENCE");
  }

  let expectedDateIso: string | null = null;
  let expectedMonthStartIso: string | null = null;
  let rangeStartDateIso: string | null = null;
  let rangeEndDateIso: string | null = null;

  if (input.timingPrecision === "EXACT_DATE") {
    if (!input.expectedDateIso) {
      throw new Error("FINANCE_EXPECTED_EVENT_INVALID_TIMING:expectedDate_required");
    }
    parseFinanceCalendarDateIso(input.expectedDateIso);
    expectedDateIso = input.expectedDateIso.trim();
    if (
      input.expectedMonthStartIso ||
      input.rangeStartDateIso ||
      input.rangeEndDateIso
    ) {
      throw new Error("FINANCE_EXPECTED_EVENT_INVALID_TIMING:exact_date_exclusive_fields");
    }
  } else if (input.timingPrecision === "MONTH") {
    if (!input.expectedMonthStartIso) {
      throw new Error("FINANCE_EXPECTED_EVENT_INVALID_TIMING:expectedMonthStart_required");
    }
    parseFinanceCalendarDateIso(input.expectedMonthStartIso);
    assertFirstOfMonth(input.expectedMonthStartIso.trim(), "expectedMonthStart");
    expectedMonthStartIso = input.expectedMonthStartIso.trim();
    if (input.expectedDateIso || input.rangeStartDateIso || input.rangeEndDateIso) {
      throw new Error("FINANCE_EXPECTED_EVENT_INVALID_TIMING:month_exclusive_fields");
    }
  } else {
    if (!input.rangeStartDateIso || !input.rangeEndDateIso) {
      throw new Error("FINANCE_EXPECTED_EVENT_INVALID_TIMING:date_range_required");
    }
    const start = parseFinanceCalendarDateIso(input.rangeStartDateIso);
    const end = parseFinanceCalendarDateIso(input.rangeEndDateIso);
    if (start.getTime() > end.getTime()) {
      throw new Error("FINANCE_EXPECTED_EVENT_INVALID_TIMING:range_start_after_end");
    }
    rangeStartDateIso = input.rangeStartDateIso.trim();
    rangeEndDateIso = input.rangeEndDateIso.trim();
    if (input.expectedDateIso || input.expectedMonthStartIso) {
      throw new Error("FINANCE_EXPECTED_EVENT_INVALID_TIMING:range_exclusive_fields");
    }
  }

  return {
    tenantId: input.tenantId.trim(),
    financeYearId: input.financeYearId.trim(),
    financialAccountId: input.financialAccountId.trim(),
    expectedAmountMinor: input.expectedAmountMinor,
    timingPrecision: input.timingPrecision,
    expectedDateIso,
    expectedMonthStartIso,
    rangeStartDateIso,
    rangeEndDateIso,
    sourceKind,
    sourceRefType,
    sourceRefId,
    description: normalizeOptionalText(input.description),
  };
}

/**
 * Expected event timing may fall outside finance year boundaries — ownership year
 * is `financeYearId`; settlement timing is not rejected here (FIN-04E-02).
 */
export function assertExpectedEventTimingNotUnscheduledPersistence(
  timingPrecision: string,
): void {
  if (timingPrecision === "UNSCHEDULED") {
    throw new Error("FINANCE_EXPECTED_EVENT_UNSCHEDULED_NOT_PERSISTED");
  }
}
