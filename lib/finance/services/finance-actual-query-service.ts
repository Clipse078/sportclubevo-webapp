import type { PrismaClient } from "@prisma/client";
import { buildActualVarianceReadModel } from "@/lib/finance/actual/actual-variance-read-model";
import type { BudgetComparisonMode } from "@/lib/finance/actual/period-semantics";
import {
  isEffectiveDateOnOrBeforeCutoff,
  resolveYtdCutoffDate,
} from "@/lib/finance/actual/period-semantics";
import { resolveBudgetSelectedYearId } from "@/lib/finance/budget/resolve-budget-selected-year";
import { requireFinanceActualView, type FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { resolveApprovedBudgetMeasure } from "@/lib/finance/reporting/approved-budget-measure-provider";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import { listFinancialAccounts } from "@/lib/finance/services/financial-account-service";

type Db = Pick<
  PrismaClient,
  | "financeYear"
  | "financeConfiguration"
  | "financeBudget"
  | "financeActualEntry"
  | "financialAccount"
  | "financialReportingGroup"
>;

export type ActualsWorkspaceEntry = {
  id: string;
  effectiveDate: Date;
  amountMinor: number;
  currency: string;
  description: string | null;
  source: string;
  account: {
    id: string;
    name: string;
    canonicalSemantic: "INCOME" | "EXPENSE";
    lifecycle: "ACTIVE" | "ARCHIVED";
  };
};

export type ActualsWorkspaceSnapshot = {
  selectedYearId: string | null;
  comparisonMode: BudgetComparisonMode;
  ytdCutoffDate: Date | null;
  baseCurrency: string | null;
  entries: ActualsWorkspaceEntry[];
  variance: ReturnType<typeof buildActualVarianceReadModel>;
  selectableAccounts: Array<{
    id: string;
    name: string;
    canonicalSemantic: "INCOME" | "EXPENSE";
  }>;
};

export async function loadActualsWorkspaceSnapshot(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    requestedYearId: string | null;
    comparisonMode?: BudgetComparisonMode;
    referenceDate?: Date;
  },
): Promise<{
  years: Array<{ id: string; name: string }>;
  snapshot: ActualsWorkspaceSnapshot;
}> {
  requireFinanceActualView(ctx);

  const comparisonMode = input.comparisonMode ?? "FULL_YEAR";

  const [config, years] = await Promise.all([
    db.financeConfiguration.findUnique({
      where: { tenantId: ctx.tenantId },
      select: { baseCurrency: true, currentFinanceYearId: true },
    }),
    db.financeYear.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        tenantId: true,
        status: true,
      },
    }),
  ]);

  const baseCurrency = config?.baseCurrency?.trim().toUpperCase() ?? null;
  const selectedYearId = resolveBudgetSelectedYearId({
    requestedYearId: input.requestedYearId,
    years,
    currentFinanceYearId: config?.currentFinanceYearId ?? null,
  });

  const emptyVariance = buildActualVarianceReadModel({
    tenantId: ctx.tenantId,
    financeYearId: selectedYearId ?? "",
    financeYearName: "",
    baseCurrency,
    comparisonMode,
    ytdCutoffDate: null,
    approvedMeasure: null,
    accounts: [],
    actualEntries: [],
  });

  if (!selectedYearId || !baseCurrency) {
    return {
      years: years.map((y) => ({ id: y.id, name: y.name })),
      snapshot: {
        selectedYearId,
        comparisonMode,
        ytdCutoffDate: null,
        baseCurrency,
        entries: [],
        variance: {
          ...emptyVariance,
          availability: baseCurrency ? "NO_FINANCE_YEAR" : "NO_BASE_CURRENCY",
        },
        selectableAccounts: [],
      },
    };
  }

  const year = years.find((y) => y.id === selectedYearId)!;
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");

  const accounts = (await listFinancialAccounts(db, ctx)).filter(
    (a) => a.canonicalSemantic === "INCOME" || a.canonicalSemantic === "EXPENSE",
  );

  if (accounts.length === 0) {
    return {
      years: years.map((y) => ({ id: y.id, name: y.name })),
      snapshot: {
        selectedYearId,
        comparisonMode,
        ytdCutoffDate: null,
        baseCurrency,
        entries: [],
        variance: {
          ...emptyVariance,
          financeYearId: selectedYearId,
          financeYearName: year.name,
          availability: "NO_STRUCTURE",
        },
        selectableAccounts: [],
      },
    };
  }

  const ytdCutoffDate =
    comparisonMode === "YTD"
      ? resolveYtdCutoffDate(
          { startDate: year.startDate, endDate: year.endDate },
          input.referenceDate ?? new Date(),
        )
      : null;

  const rawEntries = await db.financeActualEntry.findMany({
    where: { tenantId: ctx.tenantId, financeYearId: selectedYearId },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
    include: {
      financialAccount: {
        select: {
          id: true,
          name: true,
          canonicalSemantic: true,
          lifecycle: true,
        },
      },
    },
  });

  const filteredForAggregation = rawEntries.filter((entry) => {
    if (comparisonMode !== "YTD" || !ytdCutoffDate) return true;
    return isEffectiveDateOnOrBeforeCutoff(entry.effectiveDate, ytdCutoffDate);
  });

  const budget = await db.financeBudget.findUnique({
    where: {
      tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId: selectedYearId },
    },
    include: {
      versions: { include: { lines: true } },
    },
  });

  const approvedMeasure = budget
    ? resolveApprovedBudgetMeasure({
        currentBaselineVersionId: budget.currentBaselineVersionId,
        versions: budget.versions,
      })
    : null;

  const variance = buildActualVarianceReadModel({
    tenantId: ctx.tenantId,
    financeYearId: selectedYearId,
    financeYearName: year.name,
    baseCurrency,
    comparisonMode,
    ytdCutoffDate,
    approvedMeasure,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      canonicalSemantic: a.canonicalSemantic as "INCOME" | "EXPENSE",
      lifecycle: a.lifecycle,
    })),
    actualEntries: filteredForAggregation.map((entry) => ({
      financialAccountId: entry.financialAccountId,
      canonicalSemantic: entry.financialAccount.canonicalSemantic as "INCOME" | "EXPENSE",
      amountMinor: entry.amountMinor,
    })),
  });

  return {
    years: years.map((y) => ({ id: y.id, name: y.name })),
    snapshot: {
      selectedYearId,
      comparisonMode,
      ytdCutoffDate,
      baseCurrency,
      entries: rawEntries.map((entry) => ({
        id: entry.id,
        effectiveDate: entry.effectiveDate,
        amountMinor: entry.amountMinor,
        currency: entry.currency,
        description: entry.description,
        source: entry.source,
        account: {
          id: entry.financialAccount.id,
          name: entry.financialAccount.name,
          canonicalSemantic: entry.financialAccount.canonicalSemantic as "INCOME" | "EXPENSE",
          lifecycle: entry.financialAccount.lifecycle,
        },
      })),
      variance,
      selectableAccounts: accounts
        .filter((a) => a.lifecycle === "ACTIVE")
        .map((a) => ({
          id: a.id,
          name: a.name,
          canonicalSemantic: a.canonicalSemantic as "INCOME" | "EXPENSE",
        })),
    },
  };
}
