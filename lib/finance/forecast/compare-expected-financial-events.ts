import type { ExpectedFinancialEventRecord } from "@/lib/finance/forecast/expected-financial-event-row-mapper";

function timingPositionMs(event: ExpectedFinancialEventRecord): number {
  if (event.timingPrecision === "EXACT_DATE" && event.expectedDateIso) {
    return Date.parse(`${event.expectedDateIso}T00:00:00.000Z`);
  }
  if (event.timingPrecision === "MONTH" && event.expectedMonthStartIso) {
    return Date.parse(`${event.expectedMonthStartIso}T00:00:00.000Z`);
  }
  if (event.timingPrecision === "DATE_RANGE" && event.rangeStartDateIso) {
    return Date.parse(`${event.rangeStartDateIso}T00:00:00.000Z`);
  }
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Deterministic list ordering: timing position, then account, then stable id.
 * Does not coerce MONTH/RANGE into fake exact dates beyond their canonical anchors.
 */
export function compareExpectedFinancialEventsForList(
  a: ExpectedFinancialEventRecord,
  b: ExpectedFinancialEventRecord,
): number {
  const pos = timingPositionMs(a) - timingPositionMs(b);
  if (pos !== 0) return pos;
  const account = a.financialAccountId.localeCompare(b.financialAccountId);
  if (account !== 0) return account;
  return a.id.localeCompare(b.id);
}

export function sortExpectedFinancialEventsForList(
  events: ExpectedFinancialEventRecord[],
): ExpectedFinancialEventRecord[] {
  return [...events].sort(compareExpectedFinancialEventsForList);
}
