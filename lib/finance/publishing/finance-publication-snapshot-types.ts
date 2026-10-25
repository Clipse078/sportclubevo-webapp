/**
 * FIN-06A — canonical publication snapshot semantic payload (not UI state).
 */

import type { FinancePublishingReportingScope } from "@/lib/finance/publishing/finance-publication-scope";
import type { FinancePublishingAudienceClass } from "@/lib/finance/publishing/finance-publishing-sharing-architecture-contract";

export type FinancePublicationSnapshotPayloadV1 = {
  schemaVersion: "sce.finance.publication.snapshot.v1";
  tenantId: string;
  publicationId: string;
  publicationVersion: number;
  title: string;
  financeYearId: string;
  reportingScope: FinancePublishingReportingScope;
  currencyCode: string;
  publishedAt: string;
  publisherUserId: string;
  approvalState: "APPROVED" | "PUBLISHED_WITHOUT_SEPARATE_APPROVAL";
  audienceClass: FinancePublishingAudienceClass;
  sourceReferenceMetadata: {
    reportingSemanticVersion: string;
    measureVisibilitySnapshot: readonly string[];
  };
  hierarchyLabels: readonly {
    nodeId: string;
    label: string;
    parentNodeId: string | null;
  }[];
  totals: {
    incomeMinor: number | null;
    expenseMinor: number | null;
    resultMinor: number | null;
  };
  comparativeMeasuresIncluded: readonly string[];
  explanatoryMetadata: Record<string, string>;
  renderedReportingSemanticPayload: Record<string, unknown>;
};
