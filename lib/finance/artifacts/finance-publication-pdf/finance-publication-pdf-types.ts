import type { FinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";

export type FinancePublicationPdfLabels = {
  /** Masthead report family, e.g. Finanzbericht {year} */
  financialReportHeading: string;
  /** Canonical report type subtitle, e.g. Management-Erfolgsrechnung */
  reportTypeSubtitle: string;
  officialPublicationLine: string;
  publishedAtLabel: string;
  pdfGeneratedAtLabel: string;
  publicationInfoTitle: string;
  versionLabel: string;
  /** Hero */
  expectedResultLabel: string;
  varianceVsBudgetLabel: string;
  budgetResultLabel: string;
  actualResultLabel: string;
  forecastResultLabel: string;
  favorabilityFavorable: string;
  favorabilityUnfavorable: string;
  favorabilityOnPlan: string;
  /** Management interpretation */
  managementAssessmentTitle: string;
  attentionResultFavorableTitle: string;
  attentionResultUnfavorableTitle: string;
  attentionResultOnPlanTitle: string;
  attentionResultFavorableDetail: string;
  attentionResultUnfavorableDetail: string;
  positiveDriverTitle: string;
  negativeDriverTitle: string;
  attentionDriverExpenseSuffix: string;
  /** Material deviations */
  majorDeviationsTitle: string;
  columnPosition: string;
  columnDeviation: string;
  columnComment: string;
  deviationCommentFavorable: string;
  deviationCommentUnfavorable: string;
  /** Statement */
  statementSectionTitle: string;
  amountsInCurrencyLabel: string;
  incomeSection: string;
  expenseSection: string;
  incomeSectionTotal: string;
  expenseSectionTotal: string;
  managementResult: string;
  columnBudget: string;
  columnActual: string;
  columnForecast: string;
  columnVarianceVsBudget: string;
  unassignedGroup: string;
  /** Publication metadata */
  metadataOrganisationLabel: string;
  metadataFinanceYearLabel: string;
  metadataReportTypeLabel: string;
  metadataVersionLabel: string;
  metadataPublishedAtLabel: string;
  metadataPdfGeneratedAtLabel: string;
  /** Snapshot notice */
  snapshotImmutabilityNotice: string;
  /** Footer */
  createdWithSportClubEvo: string;
  pageOfLabel: string;
};

export type FinancePublicationPdfDocumentInput = {
  organisationName: string;
  formattingLocale: string;
  translationLocale: string;
  generatedAt: Date;
  presentation: FinancePublishedManagementPnlInspectionReadModel;
  labels: FinancePublicationPdfLabels;
  /** Optional PNG/JPEG bytes for tenant crest — omitted when unavailable. */
  organisationLogoBytes: Uint8Array | null;
  organisationLogoMime: "image/png" | "image/jpeg" | null;
  /** BCP-47 language tag for PDF document catalog (e.g. de-CH). */
  documentLanguage: string;
  /** Test-only: capture primitives actually sent to pdf-lib. */
  recordDrawOperations?: boolean;
};

export type FinancePublicationPdfGenerationResult = {
  pdfBytes: Uint8Array;
  pageCount: number;
  filename: string;
  /** Present when `recordDrawOperations` was enabled on the document input. */
  drawOperations?: import("@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-draw-recorder").PublicationPdfRecordedDraw[];
};
