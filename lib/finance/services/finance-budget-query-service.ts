import type { PrismaClient } from "@prisma/client";
import {
  canManageDraftBudget,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import {
  buildBudgetPlanningRows,
  buildBudgetVersionHistory,
  budgetTotalsFromRows,
  type BudgetWorkspaceSnapshot,
} from "@/lib/finance/budget/budget-presentation";
import { evaluateBudgetApprovalReadiness } from "@/lib/finance/budget/budget-approval-readiness";
import { resolveCurrentGovernanceBaselineVersion } from "@/lib/finance/budget/current-governance-baseline";
import { resolveBudgetSelectedYearId } from "@/lib/finance/budget/resolve-budget-selected-year";
import {
  listFinanceYearsForBudget,
  loadBudgetForYear,
  resolveTenantBudgetCurrency,
} from "@/lib/finance/services/finance-budget-service";
import {
  loadAnnualBudgetCreationContext,
  type AnnualBudgetCreationContext,
} from "@/lib/finance/services/finance-annual-budget-service";

type Db = Pick<PrismaClient, "financialAccount" | "financeYear" | "financeConfiguration"> &
  Parameters<typeof loadBudgetForYear>[0];

export async function loadBudgetWorkspaceSnapshot(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string | null,
): Promise<{
  years: Awaited<ReturnType<typeof listFinanceYearsForBudget>>;
  snapshot: BudgetWorkspaceSnapshot | null;
  hasAccounts: boolean;
  selectedYearId: string | null;
  baseCurrency: string | null;
  annualCreation: AnnualBudgetCreationContext | null;
}> {
  const years = await listFinanceYearsForBudget(db, ctx);
  const baseCurrency = await resolveTenantBudgetCurrency(db, ctx);
  const financeConfig = await db.financeConfiguration.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { currentFinanceYearId: true },
  });

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    include: { reportingGroup: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const hasAccounts = accounts.some(
    (a) => a.canonicalSemantic === "INCOME" || a.canonicalSemantic === "EXPENSE",
  );

  const selectedYearId = resolveBudgetSelectedYearId({
    requestedYearId: financeYearId,
    years,
    currentFinanceYearId: financeConfig?.currentFinanceYearId ?? null,
  });
  if (!selectedYearId) {
    return {
      years,
      snapshot: null,
      hasAccounts,
      selectedYearId: null,
      baseCurrency,
      annualCreation: null,
    };
  }

  const year = years.find((y) => y.id === selectedYearId) ?? null;
  if (!year) {
    return {
      years,
      snapshot: null,
      hasAccounts,
      selectedYearId: null,
      baseCurrency,
      annualCreation: null,
    };
  }

  const budget = await loadBudgetForYear(db, ctx, selectedYearId);
  const draftVersion = budget?.versions.find((v) => v.status === "DRAFT") ?? null;
  const currentBaselineVersion =
    budget && budget.versions.length > 0
      ? resolveCurrentGovernanceBaselineVersion({
          currentBaselineVersionId: budget.currentBaselineVersionId ?? null,
          versions: budget.versions,
        })
      : null;
  const approvedVersion = currentBaselineVersion;
  const workingVersion = draftVersion ?? approvedVersion ?? null;

  const rows = buildBudgetPlanningRows({
    accounts,
    lines: workingVersion?.lines ?? [],
  });

  const approvedRows = approvedVersion
    ? buildBudgetPlanningRows({
        accounts,
        lines: approvedVersion.lines,
      })
    : null;

  const workspaceStatus: BudgetWorkspaceSnapshot["status"] = !workingVersion
    ? "NONE"
    : draftVersion && approvedVersion
      ? "WORKING_REVISION"
      : workingVersion.status === "APPROVED"
        ? "APPROVED"
        : "DRAFT";

  const approvalMode: BudgetWorkspaceSnapshot["approvalMode"] =
    draftVersion && approvedVersion
      ? "REBASELINE"
      : draftVersion && !approvedVersion
        ? "FIRST_APPROVAL"
        : null;

  const approvalReadiness =
    draftVersion && approvalMode
      ? evaluateBudgetApprovalReadiness({
          mode: approvalMode,
          versionStatus: "DRAFT",
          baseCurrency,
          lines: draftVersion.lines.map((line) => ({
            amountMinor: line.amountMinor,
            financialAccountId: line.financialAccountId,
            financialAccount: {
              lifecycle: line.financialAccount.lifecycle,
              canonicalSemantic: line.financialAccount.canonicalSemantic,
            },
          })),
          currentBaselineExists: Boolean(approvedVersion),
        })
      : null;

  const snapshot: BudgetWorkspaceSnapshot = {
    financeYearId: selectedYearId,
    financeYearName: year.name,
    budgetId: budget?.id ?? null,
    versionId: workingVersion?.id ?? null,
    versionNumber: workingVersion?.versionNumber ?? null,
    status: workspaceStatus,
    approvedAt: approvedVersion?.approvedAt ?? null,
    approvedByLabel: approvedVersion?.approvedBy
      ? `${approvedVersion.approvedBy.firstName} ${approvedVersion.approvedBy.lastName}`.trim()
      : null,
    currency: approvedVersion?.baseCurrency ?? baseCurrency,
    rows,
    totals: budgetTotalsFromRows(rows),
    approvedBaseline: approvedVersion
      ? {
          versionId: approvedVersion.id,
          versionNumber: approvedVersion.versionNumber,
          approvedAt: approvedVersion.approvedAt,
          approvedByLabel: approvedVersion.approvedBy
            ? `${approvedVersion.approvedBy.firstName} ${approvedVersion.approvedBy.lastName}`.trim()
            : null,
          currency: approvedVersion.baseCurrency ?? baseCurrency,
          totals: budgetTotalsFromRows(approvedRows ?? []),
        }
      : null,
    versionHistory: budget
      ? buildBudgetVersionHistory({
          versions: budget.versions.map((v) => ({
            id: v.id,
            versionNumber: v.versionNumber,
            status: v.status,
            approvedAt: v.approvedAt,
            approvedBy: v.approvedBy,
            createdAt: v.createdAt,
          })),
          governanceBaselineVersionId: approvedVersion?.id ?? null,
        })
      : [],
    approvalReadiness,
    approvalMode,
  };

  const annualCreation =
    !budget && canManageDraftBudget(ctx)
      ? await loadAnnualBudgetCreationContext(db, ctx, selectedYearId)
      : null;

  return { years, snapshot, hasAccounts, selectedYearId, baseCurrency, annualCreation };
}
