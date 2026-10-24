/**
 * FIN-04C-03 — tenant-facing formal reforecast ("Neue Prognose festhalten") contracts.
 */

/** Stable action/service outcomes for confirmation UI (no internal error leakage). */
export const FORMAL_REFORECAST_OUTCOMES = [
  "SUCCESS",
  "STALE_CURRENT",
  "INVALID_AS_OF_DATE",
  "INVALID_ACTUALS_THROUGH_DATE",
  "INVALID_LABEL",
  "NO_CURRENT_FORECAST",
  "PERMISSION_DENIED",
  "INVALID_FINANCE_YEAR",
  "UNEXPECTED_ERROR",
] as const;

export type FormalReforecastOutcome = (typeof FORMAL_REFORECAST_OUTCOMES)[number];

/**
 * When the caller omits `actualsThroughDate`, the application layer defaults it to `asOfDate`
 * (same calendar day). An earlier actual cutoff remains supported when explicitly provided.
 * `actualsThroughDate` must never be after `asOfDate`.
 */
export const FORMAL_REFORECAST_ACTUALS_THROUGH_DEFAULT_RULE =
  "DEFAULT_TO_AS_OF_DATE_WHEN_OMITTED" as const;

export const FORMAL_REFORECAST_REVISION_LABEL_MAX_LENGTH = 120;

export type FormalReforecastPreviousRevisionSummary = {
  versionId: string;
  versionNumber: number;
  revisionSource: string | null;
  revisionLabel: string | null;
  asOfDate: string | null;
  actualsThroughDate: string | null;
} | null;

export type FormalReforecastPreviewResult = {
  financeYearId: string;
  forecastId: string;
  currentForecastVersionId: string;
  currentVersionNumber: number;
  nextVersionNumber: number;
  lineCount: number;
  incomeMinor: number;
  expenseMinor: number;
  resultMinor: number;
  asOfDate: string;
  actualsThroughDate: string;
  revisionLabel: string | null;
  recommendedAsOfDate: string | null;
  amountsUnchangedByFormalization: true;
  previousFormalRevision: FormalReforecastPreviousRevisionSummary;
};

export type FormalizeCurrentForecastResult = {
  forecastId: string;
  previousVersionId: string;
  previousVersionNumber: number;
  currentVersionId: string;
  currentVersionNumber: number;
  asOfDate: string;
  actualsThroughDate: string;
  revisionSource: "MANUAL_REFORECAST";
  revisionLabel: string | null;
  lineCount: number;
  incomeMinor: number;
  expenseMinor: number;
  resultMinor: number;
};
