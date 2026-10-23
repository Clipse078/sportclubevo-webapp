import type { PrismaClient } from "@prisma/client";
import { resolveBudgetSelectedYearId } from "@/lib/finance/budget/resolve-budget-selected-year";
import { requireFinanceView, type FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  buildApprovedBudgetReportingContextKey,
  resolveApprovedBudgetMeasure,
} from "@/lib/finance/reporting/approved-budget-measure-provider";
import {
  buildFinancialReportingTree,
  summarizeReportingTree,
} from "@/lib/finance/reporting/build-reporting-tree";
import { FINANCIAL_MEASURE_APPROVED_BUDGET } from "@/lib/finance/reporting/financial-measures";
import type { FinancialReportingReadModel } from "@/lib/finance/reporting/reporting-read-model";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import { listFinancialAccounts } from "@/lib/finance/services/financial-account-service";
import { listFinancialReportingGroups } from "@/lib/finance/services/financial-reporting-group-service";

type Db = Pick<
  PrismaClient,
  | "financeYear"
  | "financeConfiguration"
  | "financeBudget"
  | "financialReportingGroup"
  | "financialAccount"
>;

function emptyReadModel(
  ctx: FinanceAuthContext,
  partial: Pick<
    FinancialReportingReadModel,
    "financeYearId" | "financeYearName" | "availability" | "baseCurrency"
  >,
): FinancialReportingReadModel {
  return {
    tenantId: ctx.tenantId,
    financeYearId: partial.financeYearId,
    financeYearName: partial.financeYearName,
    measure: FINANCIAL_MEASURE_APPROVED_BUDGET,
    mode: "LIVE",
    baseCurrency: partial.baseCurrency,
    availability: partial.availability,
    reportingContextKey: null,
    approvedBudgetVersionId: null,
    approvedAt: null,
    tree: [],
    summary: { incomeMinor: 0, expenseMinor: 0, resultMinor: 0 },
  };
}

export async function loadApprovedBudgetReportingReadModel(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string | null,
): Promise<FinancialReportingReadModel> {
  requireFinanceView(ctx);

  const [config, years, groups, accounts] = await Promise.all([
    db.financeConfiguration.findUnique({
      where: { tenantId: ctx.tenantId },
      select: { baseCurrency: true, currentFinanceYearId: true },
    }),
    db.financeYear.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { startDate: "desc" },
    }),
    listFinancialReportingGroups(db, ctx),
    listFinancialAccounts(db, ctx),
  ]);

  const baseCurrency = config?.baseCurrency ?? null;
  if (!baseCurrency) {
    return emptyReadModel(ctx, {
      financeYearId: null,
      financeYearName: null,
      availability: "NO_BASE_CURRENCY",
      baseCurrency: null,
    });
  }

  const selectedYearId = resolveBudgetSelectedYearId({
    requestedYearId: financeYearId,
    years,
    currentFinanceYearId: config?.currentFinanceYearId ?? null,
  });

  if (!selectedYearId) {
    return emptyReadModel(ctx, {
      financeYearId: null,
      financeYearName: null,
      availability: "NO_FINANCE_YEAR",
      baseCurrency,
    });
  }

  const year = years.find((y) => y.id === selectedYearId)!;
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");

  const hasStructure = groups.length > 0 || accounts.some(
    (a) => a.canonicalSemantic === "INCOME" || a.canonicalSemantic === "EXPENSE",
  );
  if (!hasStructure) {
    return emptyReadModel(ctx, {
      financeYearId: selectedYearId,
      financeYearName: year.name,
      availability: "NO_STRUCTURE",
      baseCurrency,
    });
  }

  const budget = await db.financeBudget.findUnique({
    where: {
      tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId: selectedYearId },
    },
    include: {
      versions: {
        include: { lines: true },
      },
    },
  });

  const measure = resolveApprovedBudgetMeasure({
    currentBaselineVersionId: budget?.currentBaselineVersionId ?? null,
    versions: budget?.versions ?? [],
  });
  if (!measure) {
    return emptyReadModel(ctx, {
      financeYearId: selectedYearId,
      financeYearName: year.name,
      availability: "NO_APPROVED_BASELINE",
      baseCurrency,
    });
  }

  const reportingCurrency = measure.baseCurrency ?? baseCurrency;

  const tree = buildFinancialReportingTree({
    groups,
    accounts,
    valuesByAccountId: measure.valuesByAccountId,
  });
  const totals = summarizeReportingTree(tree);

  return {
    tenantId: ctx.tenantId,
    financeYearId: selectedYearId,
    financeYearName: year.name,
    measure: FINANCIAL_MEASURE_APPROVED_BUDGET,
    mode: "LIVE",
    baseCurrency: reportingCurrency,
    availability: "AVAILABLE",
    reportingContextKey: buildApprovedBudgetReportingContextKey({
      tenantId: ctx.tenantId,
      financeYearId: selectedYearId,
      budgetVersionId: measure.budgetVersionId,
    }),
    approvedBudgetVersionId: measure.budgetVersionId,
    approvedAt: measure.approvedAt,
    tree,
    summary: {
      incomeMinor: totals.incomeMinor,
      expenseMinor: totals.expenseMinor,
      resultMinor: totals.incomeMinor - totals.expenseMinor,
    },
  };
}
