/**
 * FIN-01E — extensible financial measure identity (no speculative persistence).
 * Additional measures (ACTUAL, FORECAST, …) plug in via providers later.
 */

export const FINANCIAL_MEASURE_APPROVED_BUDGET = "APPROVED_BUDGET" as const;

export type FinancialMeasureKey = typeof FINANCIAL_MEASURE_APPROVED_BUDGET;

export type FinancialReportingScope = {
  financeYearId: string;
  measure: FinancialMeasureKey;
};

/** Live reporting derived from canonical Finance data (not a publication snapshot). */
export type FinancialReportingMode = "LIVE";

export type FinancialReportingQuery = FinancialReportingScope & {
  mode: FinancialReportingMode;
};
