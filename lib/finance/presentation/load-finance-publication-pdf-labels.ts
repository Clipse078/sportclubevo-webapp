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
    expectedResultLabel: pnl("expectedResult"),
    varianceVsBudgetLabel: pnl("varianceVsBudget"),
    budgetResultLabel: pnl("budgetedResult"),
    actualResultLabel: pnl("columnActual"),
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
    attentionLargestFavorableTitle: pnl("attentionLargestFavorableTitle"),
    attentionLargestUnfavorableTitle: pnl("attentionLargestUnfavorableTitle"),
    attentionDriverExpenseSuffix: pnl("attentionDriverExpenseSuffix"),
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
    createdWithSportClubEvo: pub("pdfCreatedWithSportClubEvo"),
    pageOfLabel: pub("pdfPageOf"),
  };
}
