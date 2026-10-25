import type { FinanceExpectedFinancialEvent } from "@prisma/client";
import { formatFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import type { ExpectedFinancialEventForReconciliation } from "@/lib/finance/forecast/expected-financial-event-reconciliation-types";

/** Presentation-neutral domain record for expected event reads (FIN-04E-03). */
export type ExpectedFinancialEventRecord = {
  id: string;
  tenantId: string;
  financeYearId: string;
  financialAccountId: string;
  expectedAmountMinor: number;
  timingPrecision: FinanceExpectedFinancialEvent["timingPrecision"];
  expectedDateIso: string | null;
  expectedMonthStartIso: string | null;
  rangeStartDateIso: string | null;
  rangeEndDateIso: string | null;
  sourceKind: FinanceExpectedFinancialEvent["sourceKind"];
  sourceRefType: string | null;
  sourceRefId: string | null;
  description: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

function optionalDateIso(value: Date | null | undefined): string | null {
  return value ? formatFinanceCalendarDateIso(value) : null;
}

export function mapExpectedFinancialEventRow(
  row: FinanceExpectedFinancialEvent,
): ExpectedFinancialEventRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    financeYearId: row.financeYearId,
    financialAccountId: row.financialAccountId,
    expectedAmountMinor: row.expectedAmountMinor,
    timingPrecision: row.timingPrecision,
    expectedDateIso: optionalDateIso(row.expectedDate),
    expectedMonthStartIso: optionalDateIso(row.expectedMonthStart),
    rangeStartDateIso: optionalDateIso(row.rangeStartDate),
    rangeEndDateIso: optionalDateIso(row.rangeEndDate),
    sourceKind: row.sourceKind,
    sourceRefType: row.sourceRefType,
    sourceRefId: row.sourceRefId,
    description: row.description,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapExpectedFinancialEventToReconciliationShape(
  row: Pick<
    FinanceExpectedFinancialEvent,
    | "expectedAmountMinor"
    | "timingPrecision"
    | "expectedDate"
    | "expectedMonthStart"
    | "rangeStartDate"
    | "rangeEndDate"
  >,
): ExpectedFinancialEventForReconciliation {
  return {
    expectedAmountMinor: row.expectedAmountMinor,
    timingPrecision: row.timingPrecision,
    expectedDateIso: optionalDateIso(row.expectedDate),
    expectedMonthStartIso: optionalDateIso(row.expectedMonthStart),
    rangeStartDateIso: optionalDateIso(row.rangeStartDate),
    rangeEndDateIso: optionalDateIso(row.rangeEndDate),
  };
}
