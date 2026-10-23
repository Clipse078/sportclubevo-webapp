import type { FinanceMeasurementMode } from "@/lib/finance/actual/finance-measurement-period";

export type FinanceMeasurementPeriodSearchParams = {
  periodStartIndex: number | null;
  periodEndIndex: number | null;
};

/**
 * Parses URL period selection.
 *
 * Canonical: `periodStart` + optional `periodEnd` (finance-year-relative month indices).
 * Legacy FIN-03B: lone `periodIndex` → single month/quarter (start = end = index).
 */
export function parseFinanceMeasurementPeriodFromSearchParams(input: {
  periodStart?: string;
  periodEnd?: string;
  periodIndex?: string;
}): FinanceMeasurementPeriodSearchParams {
  const parseIndex = (raw: string | undefined): number | null => {
    if (raw === undefined || raw === "") return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  };

  const start = parseIndex(input.periodStart);
  const end = parseIndex(input.periodEnd);
  const legacy = parseIndex(input.periodIndex);

  if (start !== null) {
    return {
      periodStartIndex: start,
      periodEndIndex: end ?? start,
    };
  }

  if (legacy !== null) {
    return { periodStartIndex: legacy, periodEndIndex: legacy };
  }

  return { periodStartIndex: null, periodEndIndex: null };
}

export function writeFinanceMeasurementPeriodToSearchParams(
  params: URLSearchParams,
  mode: FinanceMeasurementMode,
  range: FinanceMeasurementPeriodSearchParams,
): void {
  params.delete("periodIndex");
  params.delete("periodStart");
  params.delete("periodEnd");

  if (mode !== "MONTH" && mode !== "QUARTER") return;

  const start = range.periodStartIndex ?? 0;
  const end = range.periodEndIndex ?? start;
  params.set("periodStart", String(start));
  if (end !== start) {
    params.set("periodEnd", String(end));
  }
}
