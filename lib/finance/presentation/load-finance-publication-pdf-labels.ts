import type { FinancePublicationPdfLabels } from "@/lib/finance/artifacts/finance-publication-pdf/finance-publication-pdf-types";

type PublicationTranslator = (key: string, values?: Record<string, string | number>) => string;
type PnlTranslator = (key: string, values?: Record<string, string | number>) => string;
type OverviewTranslator = (key: string) => string;
type ActualsTranslator = (key: string) => string;

/** Shared label bundle for publication PDF generation (API route + tests). */
export function buildFinancePublicationPdfLabels(input: {
  overview: OverviewTranslator;
  publication: PublicationTranslator;
  pnl: PnlTranslator;
  actuals: ActualsTranslator;
}): FinancePublicationPdfLabels {
  const { overview, publication: pub, pnl, actuals } = input;
  return {
    financialReportHeading: pub("pdfFinancialReportHeading"),
    reportTypeSubtitle: pub("pdfReportTypeSubtitle"),
    officialPublicationLine: pub("pdfOfficialPublicationLine"),
    publishedAtLabel: pub("publishedAtLabel"),
    pdfGeneratedAtLabel: pub("pdfGeneratedAtLabel"),
    publicationInfoTitle: pub("pdfPublicationInfoTitle"),
    versionLabel: pub("versionLabel"),
    expectedResultLabel: pub("pdfExpectedResultLabel"),
    varianceVsBudgetLabel: pnl("varianceVsBudget"),
    budgetResultLabel: pub("pdfBudgetResultLabel"),
    actualResultLabel: pub("pdfActualToDateLabel"),
    forecastResultLabel: pub("pdfForecastSupportingLabel"),
    favorabilityFavorable: actuals("favorabilityFavorable"),
    favorabilityUnfavorable: actuals("favorabilityUnfavorable"),
    favorabilityOnPlan: actuals("favorabilityOnPlan"),
    managementAssessmentTitle: pub("pdfManagementAssessmentTitle"),
    attentionResultFavorableTitle: pnl("attentionResultFavorableTitle"),
    attentionResultUnfavorableTitle: pnl("attentionResultUnfavorableTitle"),
    attentionResultOnPlanTitle: pnl("attentionResultOnPlanTitle"),
    attentionResultFavorableDetail: pnl("attentionResultFavorableDetail"),
    attentionResultUnfavorableDetail: pnl("attentionResultUnfavorableDetail"),
    positiveDriverTitle: pub("pdfPositiveDriverLabel"),
    negativeDriverTitle: pub("pdfNegativeDriverLabel"),
    attentionDriverExpenseSuffix: pnl("attentionDriverExpenseSuffix"),
    majorDeviationsTitle: pub("pdfMajorDeviationsTitle"),
    columnPosition: pub("pdfColumnPosition"),
    columnDeviation: pub("pdfColumnDeviation"),
    columnComment: pub("pdfColumnComment"),
    deviationCommentFavorable: pub("pdfDeviationCommentFavorable"),
    deviationCommentUnfavorable: pub("pdfDeviationCommentUnfavorable"),
    statementSectionTitle: pub("pdfStatementSectionTitle"),
    amountsInCurrencyLabel: pub("pdfAmountsInCurrency"),
    incomeSection: overview("reportingIncome"),
    expenseSection: overview("reportingExpense"),
    incomeSectionTotal: pnl("incomeSectionTotal"),
    expenseSectionTotal: pnl("expenseSectionTotal"),
    managementResult: overview("reportingResult"),
    columnBudget: pnl("columnBudget"),
    columnActual: pnl("columnActual"),
    columnForecast: pnl("columnForecast"),
    columnVarianceVsBudget: pub("pdfColumnVarianceVsBudget"),
    unassignedGroup: pnl("unassignedGroup"),
    metadataOrganisationLabel: pub("pdfMetadataOrganisationLabel"),
    metadataFinanceYearLabel: pub("pdfMetadataFinanceYearLabel"),
    metadataReportTypeLabel: pub("pdfMetadataReportTypeLabel"),
    metadataVersionLabel: pub("pdfMetadataVersionLabel"),
    metadataPublishedAtLabel: pub("pdfMetadataPublishedAtLabel"),
    metadataPdfGeneratedAtLabel: pub("pdfMetadataPdfGeneratedAtLabel"),
    snapshotImmutabilityNotice: pub("pdfSnapshotImmutabilityNotice"),
    createdWithSportClubEvo: pub("pdfCreatedWithSportClubEvo"),
    pageOfLabel: pub("pdfPageOf"),
  };
}
