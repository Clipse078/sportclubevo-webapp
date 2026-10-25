import type { FinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";

export type FinancePublicationPdfLabels = {
  reportTypeLabel: string;
  publishedVersionLabel: string;
  financialYearLabel: string;
  executiveSummaryTitle: string;
  expectedResultLabel: string;
  budgetResultLabel: string;
  actualResultLabel: string;
  varianceVsBudgetLabel: string;
  favorabilityFavorable: string;
  favorabilityUnfavorable: string;
  favorabilityOnPlan: string;
  incomeSection: string;
  expenseSection: string;
  incomeSectionTotal: string;
  expenseSectionTotal: string;
  managementResult: string;
  columnBudget: string;
  columnActual: string;
  columnForecast: string;
  columnVariance: string;
  unassignedGroup: string;
  publishedAtLabel: string;
  pdfGeneratedAtLabel: string;
  publicationReferenceLabel: string;
  sportClubEvoDocumentMark: string;
  pageLabel: string;
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
};

export type FinancePublicationPdfGenerationResult = {
  pdfBytes: Uint8Array;
  pageCount: number;
  filename: string;
};
