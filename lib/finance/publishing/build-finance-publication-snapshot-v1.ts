/**
 * FIN-06B — capture durable semantic snapshot from FIN-05 Management P&L read model.
 * Server-only; does not duplicate FIN-05 calculation authority.
 */

import { FinanceDomainError } from "@/lib/finance/errors";
import type {
  FinanceManagementPnlReadModel,
  ManagementPnlMeasureCell,
} from "@/lib/finance/reporting/finance-management-pnl-read-model";
import { serializeFinanceManagementPnlReadModel } from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import type { FinancePublishingReportingScope } from "@/lib/finance/publishing/finance-publication-scope";
import type { FinancePublishingAudienceClass } from "@/lib/finance/publishing/finance-publishing-sharing-architecture-contract";
import type { FinancePublicationSnapshotPayloadV1 } from "@/lib/finance/publishing/finance-publication-snapshot-types";
import {
  FINANCE_MANAGEMENT_PNL_REPORTING_SEMANTIC_VERSION,
  FINANCE_PUBLICATION_SNAPSHOT_SCHEMA_VERSION,
} from "@/lib/finance/publishing/finance-publication-reporting-semantic-version";

export type BuildFinancePublicationSnapshotV1Input = {
  publicationId: string;
  publicationVersion: number;
  title: string;
  reportingScope: FinancePublishingReportingScope;
  audienceClass: FinancePublishingAudienceClass;
  publisherUserId: string;
  publishedAt: Date;
  pnlReadModel: FinanceManagementPnlReadModel;
};

function extractHierarchyLabels(
  model: FinanceManagementPnlReadModel,
): FinancePublicationSnapshotPayloadV1["hierarchyLabels"] {
  const labels = new Map<
    string,
    { nodeId: string; label: string; parentNodeId: string | null }
  >();

  function visitNodes(nodes: FinanceManagementPnlReadModel["incomeSection"]["nodes"]): void {
    for (const node of nodes) {
      if (node.kind === "reporting_group") {
        labels.set(node.groupId, {
          nodeId: node.groupId,
          label: node.name,
          parentNodeId: node.parentId,
        });
        visitNodes(node.children);
      }
    }
  }

  visitNodes(model.incomeSection.nodes);
  visitNodes(model.expenseSection.nodes);

  return [...labels.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function pickPrimaryMeasureAmount(cell: ManagementPnlMeasureCell): number | null {
  return cell.amountMinor;
}

function comparativeMeasuresIncluded(
  model: FinanceManagementPnlReadModel,
): readonly string[] {
  const measures: string[] = [];
  if (model.sourceVisibility.approvedBudget) measures.push("APPROVED_BUDGET");
  if (model.sourceVisibility.actual) measures.push("ACTUAL");
  if (model.sourceVisibility.currentForecast) measures.push("CURRENT_FORECAST");
  if (model.actualVsBudgetVariance) measures.push("ACTUAL_VS_BUDGET_VARIANCE");
  measures.push("FORECAST_VS_BUDGET_VARIANCE");
  return measures;
}

export function buildFinancePublicationSnapshotV1(
  input: BuildFinancePublicationSnapshotV1Input,
): FinancePublicationSnapshotPayloadV1 {
  const { pnlReadModel: model } = input;
  const serializedPnl = serializeFinanceManagementPnlReadModel(model);

  const currencyCode = model.baseCurrency?.trim().toUpperCase() ?? "";
  if (!currencyCode) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_NOT_PUBLISHABLE",
      "Publication requires a configured base currency.",
      400,
    );
  }

  return {
    schemaVersion: FINANCE_PUBLICATION_SNAPSHOT_SCHEMA_VERSION,
    tenantId: model.tenantId,
    publicationId: input.publicationId,
    publicationVersion: input.publicationVersion,
    title: input.title,
    financeYearId: model.financeYearId,
    reportingScope: input.reportingScope,
    currencyCode,
    publishedAt: input.publishedAt.toISOString(),
    publisherUserId: input.publisherUserId,
    approvalState: "PUBLISHED_WITHOUT_SEPARATE_APPROVAL",
    audienceClass: input.audienceClass,
    sourceReferenceMetadata: {
      reportingSemanticVersion: FINANCE_MANAGEMENT_PNL_REPORTING_SEMANTIC_VERSION,
      measureVisibilitySnapshot: comparativeMeasuresIncluded(model),
    },
    hierarchyLabels: extractHierarchyLabels(model),
    totals: {
      incomeMinor: pickPrimaryMeasureAmount(model.incomeSection.sectionTotal.currentForecast),
      expenseMinor: pickPrimaryMeasureAmount(model.expenseSection.sectionTotal.currentForecast),
      resultMinor: pickPrimaryMeasureAmount(model.managementResult.currentForecast),
    },
    comparativeMeasuresIncluded: comparativeMeasuresIncluded(model),
    explanatoryMetadata: {
      financeYearName: model.financeYearName,
      actualGrain: model.actualGrain ?? "ANNUAL_FULL_YEAR",
      actualCutoffDate: serializedPnl.actualCutoffDate ?? "",
      hasUnassignedFinancialValues: String(model.hasUnassignedFinancialValues),
    },
    renderedReportingSemanticPayload: {
      kind: "MANAGEMENT_PNL",
      reportingSemanticVersion: FINANCE_MANAGEMENT_PNL_REPORTING_SEMANTIC_VERSION,
      incomeSection: serializedPnl.incomeSection,
      expenseSection: serializedPnl.expenseSection,
      managementResult: serializedPnl.managementResult,
      interpretation: serializedPnl.interpretation,
      sourceVisibility: serializedPnl.sourceVisibility,
      reconciliation: serializedPnl.reconciliation,
    },
  };
}
