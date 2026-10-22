import type { PrismaClient } from "@prisma/client";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  buildBudgetPlanningRows,
  budgetTotalsFromRows,
  type BudgetWorkspaceSnapshot,
} from "@/lib/finance/budget/budget-presentation";
import {
  listFinanceYearsForBudget,
  loadBudgetForYear,
  resolveTenantBudgetCurrency,
} from "@/lib/finance/services/finance-budget-service";

type Db = Pick<PrismaClient, "financialAccount" | "financeYear"> & Parameters<typeof loadBudgetForYear>[0];

export async function loadBudgetWorkspaceSnapshot(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string | null,
): Promise<{
  years: Awaited<ReturnType<typeof listFinanceYearsForBudget>>;
  snapshot: BudgetWorkspaceSnapshot | null;
  hasAccounts: boolean;
}> {
  const years = await listFinanceYearsForBudget(db, ctx);
  const currency = await resolveTenantBudgetCurrency(db, ctx);

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    include: { reportingGroup: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const hasAccounts = accounts.some(
    (a) => a.canonicalSemantic === "INCOME" || a.canonicalSemantic === "EXPENSE",
  );

  const selectedYearId = financeYearId ?? years[0]?.id ?? null;
  if (!selectedYearId) {
    return { years, snapshot: null, hasAccounts };
  }

  const year = years.find((y) => y.id === selectedYearId) ?? null;
  if (!year) {
    return { years, snapshot: null, hasAccounts };
  }

  const budget = await loadBudgetForYear(db, ctx, selectedYearId);
  const workingVersion =
    budget?.versions.find((v) => v.status === "DRAFT") ??
    budget?.versions.find((v) => v.status === "APPROVED") ??
    null;

  const rows = buildBudgetPlanningRows({
    accounts,
    lines: workingVersion?.lines ?? [],
  });

  const approvedVersion = budget?.versions.find((v) => v.status === "APPROVED") ?? null;

  const snapshot: BudgetWorkspaceSnapshot = {
    financeYearId: selectedYearId,
    financeYearName: year.name,
    budgetId: budget?.id ?? null,
    versionId: workingVersion?.id ?? null,
    status: workingVersion?.status ?? "NONE",
    approvedAt: approvedVersion?.approvedAt ?? null,
    approvedByLabel: approvedVersion?.approvedBy
      ? `${approvedVersion.approvedBy.firstName} ${approvedVersion.approvedBy.lastName}`.trim()
      : null,
    currency,
    rows,
    totals: budgetTotalsFromRows(rows),
  };

  return { years, snapshot, hasAccounts };
}
