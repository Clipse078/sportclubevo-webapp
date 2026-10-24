import type { ForecastRevisionReason } from "@/lib/finance/forecast/forecast-revision-reason";
import type { ForecastRevisionSource, ForecastVersionStatus } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import type { FinanceForecastAccountComparisonRow, FinanceForecastVersionComparisonSummary } from "@/lib/finance/forecast/forecast-revision-comparison";
import type { ForecastHistoryLineageDiagnostic } from "@/lib/finance/forecast/forecast-history-lineage";
import type { ForecastHistoryDisplayMetadata } from "@/lib/finance/forecast/forecast-revision-presentation";
import type { ActualVersusAnnualForecastPresentation } from "@/lib/finance/forecast/actual-forecast-policy";

export type FinanceForecastHistoryActor = {
  userId: string;
  displayName: string;
};

export type FinanceForecastHistoryEntry = {
  forecastVersionId: string;
  versionNumber: number;
  status: ForecastVersionStatus;
  isCurrent: boolean;
  isHistorical: boolean;
  revisionSource: ForecastRevisionSource | null;
  revisionLabel: string | null;
  revisionReason: ForecastRevisionReason | null;
  revisionContext: string | null;
  asOfDate: string | null;
  actualsThroughDate: string | null;
  createdAt: string;
  createdByUserId: string | null;
  actor: FinanceForecastHistoryActor | null;
  previousVersionId: string | null;
  sourceProjectionVersionId: string | null;
  lineCount: number;
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  resultMinor: number;
  presentation: ForecastHistoryDisplayMetadata;
};

export type FinanceForecastHistoryReadModel = {
  financeYearId: string;
  forecastId: string;
  currencyCode: string | null;
  currentForecastVersionId: string | null;
  /** Display order: CURRENT first, then historical newest → oldest. */
  entries: FinanceForecastHistoryEntry[];
  /** Chronological oldest → newest (analysis / charts). */
  entriesChronological: FinanceForecastHistoryEntry[];
  lineageDiagnostics: ForecastHistoryLineageDiagnostic[];
};

export type FinanceForecastVersionRevisionRef = {
  kind: "FORECAST_VERSION";
  forecastVersionId: string;
  versionNumber: number;
  status: ForecastVersionStatus;
  revisionLabel: string | null;
  asOfDate: string | null;
  presentation: ForecastHistoryDisplayMetadata;
};

export type FinanceApprovedBudgetComparisonRef = {
  kind: "APPROVED_BUDGET";
  budgetVersionId: string;
  versionNumber: number;
  presentation: ForecastHistoryDisplayMetadata;
};

export type FinanceForecastComparisonSubject =
  | FinanceForecastVersionRevisionRef
  | FinanceApprovedBudgetComparisonRef;

export type FinanceForecastAccountComparisonRowEnriched = FinanceForecastAccountComparisonRow & {
  accountName: string;
};

export type FinanceForecastVersionComparison = {
  financeYearId: string;
  currencyCode: string | null;
  base: FinanceForecastComparisonSubject;
  comparison: FinanceForecastComparisonSubject;
  summary: FinanceForecastVersionComparisonSummary;
  accountChanges: FinanceForecastAccountComparisonRowEnriched[];
  largestChanges: FinanceForecastAccountComparisonRowEnriched[];
};

export type CurrentForecastVsPreviousResult =
  | { kind: "COMPARISON"; comparison: FinanceForecastVersionComparison }
  | { kind: "NO_PREVIOUS_FORECAST" };

export type CurrentForecastVsApprovedBudgetResult =
  | {
      kind: "COMPARISON";
      approvedBudgetVersionId: string;
      comparison: FinanceForecastVersionComparison;
    }
  | { kind: "NO_APPROVED_BUDGET" };

/** FIN-04B automatic forecast comparison remains separate — boundary contract for 04C-05. */
export type AutomaticForecastComparisonBoundary = {
  measure: "SCE_PROJECTION_VS_CURRENT_FORECAST";
  /** Use projection workspace / FIN-04B comparison — not Prognoseverlauf history. */
  includedInPrognoseverlauf: false;
  deltaSemantics: "projection_minus_forecast";
};

export const AUTOMATIC_FORECAST_COMPARISON_BOUNDARY: AutomaticForecastComparisonBoundary = {
  measure: "SCE_PROJECTION_VS_CURRENT_FORECAST",
  includedInPrognoseverlauf: false,
  deltaSemantics: "projection_minus_forecast",
};

export type ForecastActualComparisonBoundary = {
  /** Full-year forecast must not receive misleading variance vs YTD actual here. */
  mayComputeMisleadingForecastMinusActual: false;
  contextualActualsThroughDateOnly: true;
  presentationPolicy: ActualVersusAnnualForecastPresentation;
};
