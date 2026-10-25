/**
 * FIN-06B-R4 — historical publication presentation read model (snapshot authority only).
 */

import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinancePublicationSnapshotPayloadV1 } from "@/lib/finance/publishing/finance-publication-snapshot-types";
import { parseFinancePublicationSnapshotPayloadV1 } from "@/lib/finance/publishing/validate-finance-publication-snapshot-v1";
import type {
  SerializedFinanceComparativeIntelligenceReadModel,
  SerializedFinanceManagementPnlReadModel,
  SerializedManagementPnlSection,
} from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import { buildComparativeComparisonAvailabilityMatrix } from "@/lib/finance/reporting/comparative-comparison-availability";
import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";
import type { PnlReconciliationSlice } from "@/lib/finance/reporting/pnl-reporting-completeness";

export type FinancePublicationInspectionIdentity = {
  publicationId: string;
  publicationVersion: number;
  title: string;
  financeYearName: string;
  financeYearId: string;
  currencyCode: string;
  publishedAt: string;
  contentLabel: string;
  lifecycleStatus: string;
};

export type FinancePublishedManagementPnlInspectionReadModel = {
  identity: FinancePublicationInspectionIdentity;
  pnl: SerializedFinanceManagementPnlReadModel;
};

type StoredManagementPnlSemanticPayload = {
  kind: "MANAGEMENT_PNL";
  incomeSection: SerializedManagementPnlSection;
  expenseSection: SerializedManagementPnlSection;
  managementResult: SerializedFinanceManagementPnlReadModel["managementResult"];
  interpretation: SerializedFinanceManagementPnlReadModel["interpretation"];
  sourceVisibility: SerializedFinanceManagementPnlReadModel["sourceVisibility"];
  reconciliation: {
    approvedBudget: PnlReconciliationSlice;
    actual: PnlReconciliationSlice;
    currentForecast: PnlReconciliationSlice;
  };
};

const EMPTY_VARIANCE_SLICE: FinanceReportingComparisonSlice = {
  availability: "BOTH_MISSING",
  baselineMinor: null,
  comparisonMinor: null,
  rawDeltaMinor: null,
  variancePercent: null,
  favorability: null,
  absoluteVarianceMagnitudeMinor: null,
};

function parseStoredManagementPnlPayload(
  value: Record<string, unknown>,
): StoredManagementPnlSemanticPayload {
  if (value.kind !== "MANAGEMENT_PNL") {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_SNAPSHOT",
      "Publication snapshot reporting payload is not supported.",
      500,
    );
  }
  const required = [
    "incomeSection",
    "expenseSection",
    "managementResult",
    "interpretation",
    "sourceVisibility",
    "reconciliation",
  ] as const;
  for (const key of required) {
    if (!value[key] || typeof value[key] !== "object") {
      throw new FinanceDomainError(
        "FINANCE_PUBLICATION_INVALID_SNAPSHOT",
        "Publication snapshot is missing management P&L sections.",
        500,
      );
    }
  }
  return value as unknown as StoredManagementPnlSemanticPayload;
}

function buildPublicationComparativeIntelligence(
  pnl: StoredManagementPnlSemanticPayload,
  actualGrain: "ANNUAL_FULL_YEAR" | "YTD" | null,
  actualCutoffDate: string | null,
): SerializedFinanceComparativeIntelligenceReadModel {
  const matrix = buildComparativeComparisonAvailabilityMatrix({
    actualGrain: actualGrain ?? "ANNUAL_FULL_YEAR",
  });
  const forecastVsBudget = pnl.interpretation.forecastVsBudgetManagementResult;
  return {
    overallComparison: {
      pair: "CURRENT_FORECAST_VS_APPROVED_BUDGET",
      presentationRole: "SUPPORTED",
      baseline: pnl.managementResult.approvedBudget,
      comparison: pnl.managementResult.currentForecast,
      variance: forecastVsBudget,
    },
    actualContext: {
      grain: actualGrain,
      cutoffDate: actualCutoffDate,
      measure: pnl.managementResult.actual,
      presentationRole: actualGrain === "YTD" ? "CONTEXT_ONLY" : "SUPPORTED",
      grainExplanationKey:
        actualGrain === "YTD" ? "YTD_ACTUAL_VS_ANNUAL_PLAN" : "ANNUAL_ACTUAL_AND_PLAN",
    },
    actualVsBudgetVarianceRole: actualGrain === "YTD" ? "UNSUPPORTED" : "SUPPORTED",
    comparisonAvailability: matrix,
    materialDrivers: { favourable: [], unfavourable: [] },
    attentionInsights: [],
    sourceAvailability: {
      approvedBudget: pnl.sourceVisibility.approvedBudget ? "AVAILABLE" : "NOT_VISIBLE",
      actual: pnl.sourceVisibility.actual ? "AVAILABLE" : "NOT_VISIBLE",
      currentForecast: pnl.sourceVisibility.currentForecast ? "AVAILABLE" : "NOT_VISIBLE",
    },
  };
}

function resolveActualGrain(
  metadata: FinancePublicationSnapshotPayloadV1["explanatoryMetadata"],
): "ANNUAL_FULL_YEAR" | "YTD" | null {
  const grain = metadata.actualGrain?.trim();
  if (grain === "YTD") return "YTD";
  if (grain === "ANNUAL_FULL_YEAR") return "ANNUAL_FULL_YEAR";
  return "ANNUAL_FULL_YEAR";
}

export function buildFinancePublishedManagementPnlInspectionReadModel(input: {
  snapshot: FinancePublicationSnapshotPayloadV1;
  lifecycleStatus: string;
  contentLabel: string;
}): FinancePublishedManagementPnlInspectionReadModel {
  const snapshot = parseFinancePublicationSnapshotPayloadV1(input.snapshot);
  const semantic = parseStoredManagementPnlPayload(snapshot.renderedReportingSemanticPayload);

  const financeYearName =
    snapshot.explanatoryMetadata.financeYearName?.trim() || snapshot.title.trim();
  const actualGrain = resolveActualGrain(snapshot.explanatoryMetadata);
  const actualCutoffRaw = snapshot.explanatoryMetadata.actualCutoffDate?.trim();
  const actualCutoffDate = actualCutoffRaw ? actualCutoffRaw : null;

  const hasUnassigned =
    snapshot.explanatoryMetadata.hasUnassignedFinancialValues === "true";

  const pnl: SerializedFinanceManagementPnlReadModel = {
    tenantId: snapshot.tenantId,
    financeYearId: snapshot.financeYearId,
    financeYearName,
    mode: "LIVE",
    baseCurrency: snapshot.currencyCode,
    availability: "AVAILABLE",
    actualCutoffDate,
    actualGrain,
    sourceVisibility: semantic.sourceVisibility,
    approvedBudget: {
      availability: semantic.sourceVisibility.approvedBudget ? "AVAILABLE" : "NOT_VISIBLE",
      approvedBudgetVersionId: null,
    },
    actual: {
      availability: semantic.sourceVisibility.actual ? "AVAILABLE" : "NOT_VISIBLE",
      grain: actualGrain,
    },
    currentForecast: {
      availability: semantic.sourceVisibility.currentForecast ? "AVAILABLE" : "NOT_VISIBLE",
      currentForecastVersionId: null,
    },
    actualVsBudgetVariance: EMPTY_VARIANCE_SLICE,
    interpretation: semantic.interpretation,
    incomeSection: semantic.incomeSection,
    expenseSection: semantic.expenseSection,
    managementResult: semantic.managementResult,
    topFavourableDrivers: [],
    topUnfavourableDrivers: [],
    reconciliation: semantic.reconciliation,
    hasUnassignedFinancialValues: hasUnassigned,
    comparativeIntelligence: buildPublicationComparativeIntelligence(
      semantic,
      actualGrain,
      actualCutoffDate,
    ),
  };

  return {
    identity: {
      publicationId: snapshot.publicationId,
      publicationVersion: snapshot.publicationVersion,
      title: snapshot.title,
      financeYearName,
      financeYearId: snapshot.financeYearId,
      currencyCode: snapshot.currencyCode,
      publishedAt: snapshot.publishedAt,
      contentLabel: input.contentLabel,
      lifecycleStatus: input.lifecycleStatus,
    },
    pnl,
  };
}
