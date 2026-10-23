import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import { resolveCurrentGovernanceBaselineVersion } from "@/lib/finance/budget/current-governance-baseline";
import {
  defaultAnnualBudgetCopySource,
  resolveEligibleAnnualBudgetCopySources,
  type AnnualBudgetBaselineSource,
} from "@/lib/finance/budget/annual-budget-copy-sources";
import { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";
import {
  requireFinanceBudgetManage,
  requireFinanceBudgetView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  | "financeBudget"
  | "financeBudgetVersion"
  | "financeBudgetLine"
  | "financeYear"
  | "financialAccount"
  | "financeConfiguration"
> & {
  $transaction?: PrismaClient["$transaction"];
};

export type AnnualBudgetCreationMode = "EMPTY" | "COPY_FROM_PRIOR";

export type CreateAnnualBudgetResult = {
  budgetId: string;
  workingVersionId: string;
  summary:
    | {
        mode: "EMPTY";
      }
    | {
        mode: "COPY_FROM_PRIOR";
        sourceFinanceYearId: string;
        sourceBaselineVersionId: string;
        copiedLineCount: number;
        excludedArchivedLineCount: number;
        totalIncomeMinor: number;
        totalExpenseMinor: number;
        resultMinor: number;
      };
};

export type AnnualBudgetCreationContext = {
  eligibleCopySources: AnnualBudgetBaselineSource[];
  defaultCopySourceFinanceYearId: string | null;
};

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

async function loadBudgetsByYearId(db: Db, ctx: FinanceAuthContext) {
  const budgets = await db.financeBudget.findMany({
    where: { tenantId: ctx.tenantId },
    select: {
      financeYearId: true,
      currentBaselineVersionId: true,
      versions: { select: { id: true, status: true } },
    },
  });
  return new Map(
    budgets.map((budget) => [
      budget.financeYearId,
      {
        currentBaselineVersionId: budget.currentBaselineVersionId,
        versions: budget.versions,
      },
    ]),
  );
}

export async function loadAnnualBudgetCreationContext(
  db: Db,
  ctx: FinanceAuthContext,
  targetFinanceYearId: string,
): Promise<AnnualBudgetCreationContext> {
  requireFinanceBudgetView(ctx);
  const targetYear = await getFinanceYearOrThrow(db, ctx, targetFinanceYearId);
  const years = await db.financeYear.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { startDate: "desc" },
  });
  const budgetsByFinanceYearId = await loadBudgetsByYearId(db, ctx);

  const eligibleCopySources = resolveEligibleAnnualBudgetCopySources({
    targetYear,
    years,
    budgetsByFinanceYearId,
  });

  const defaultSource = defaultAnnualBudgetCopySource(eligibleCopySources);

  return {
    eligibleCopySources,
    defaultCopySourceFinanceYearId: defaultSource?.financeYearId ?? null,
  };
}

async function executeCreateAnnualBudget(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    targetFinanceYearId: string;
    mode: AnnualBudgetCreationMode;
    sourceFinanceYearId?: string;
  },
): Promise<CreateAnnualBudgetResult> {
  requireFinanceBudgetManage(ctx);
  await getFinanceYearOrThrow(db, ctx, input.targetFinanceYearId);

  const existing = await db.financeBudget.findUnique({
    where: {
      tenantId_financeYearId: {
        tenantId: ctx.tenantId,
        financeYearId: input.targetFinanceYearId,
      },
    },
  });
  if (existing) {
    throw new FinanceDomainError(
      "FINANCE_BUDGET_ALREADY_EXISTS",
      "A budget already exists for this financial year.",
      409,
    );
  }

  if (input.mode === "EMPTY") {
    try {
      const budget = await db.financeBudget.create({
        data: {
          tenantId: ctx.tenantId,
          financeYearId: input.targetFinanceYearId,
          createdByUserId: ctx.userId,
          versions: {
            create: {
              status: "DRAFT",
              versionNumber: 1,
              createdByUserId: ctx.userId,
            },
          },
        },
        include: { versions: true },
      });
      const workingVersion = budget.versions[0]!;
      return {
        budgetId: budget.id,
        workingVersionId: workingVersion.id,
        summary: { mode: "EMPTY" },
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new FinanceDomainError(
          "FINANCE_BUDGET_ALREADY_EXISTS",
          "A budget already exists for this financial year.",
          409,
        );
      }
      throw error;
    }
  }

  const years = await db.financeYear.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { startDate: "desc" },
  });
  const targetYear = years.find((y) => y.id === input.targetFinanceYearId);
  if (!targetYear) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }

  const budgetsByFinanceYearId = await loadBudgetsByYearId(db, ctx);
  const eligible = resolveEligibleAnnualBudgetCopySources({
    targetYear,
    years,
    budgetsByFinanceYearId,
  });

  const sourceFinanceYearId = input.sourceFinanceYearId?.trim();
  if (!sourceFinanceYearId) {
    throw new FinanceDomainError(
      "FINANCE_BUDGET_COPY_SOURCE_REQUIRED",
      "Select a prior financial year with an approved current baseline.",
    );
  }

  const selectedSource = eligible.find((s) => s.financeYearId === sourceFinanceYearId);
  if (!selectedSource) {
    throw new FinanceDomainError(
      "FINANCE_BUDGET_INVALID_COPY_SOURCE",
      "The selected prior-year baseline is not eligible for copy.",
    );
  }

  const sourceBudget = await db.financeBudget.findUnique({
    where: {
      tenantId_financeYearId: {
        tenantId: ctx.tenantId,
        financeYearId: selectedSource.financeYearId,
      },
    },
    include: {
      versions: {
        include: {
          lines: {
            include: {
              financialAccount: {
                select: { lifecycle: true, canonicalSemantic: true },
              },
            },
          },
        },
      },
    },
  });
  if (!sourceBudget) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Source budget not found.", 404);
  }

  const baselineVersion = resolveCurrentGovernanceBaselineVersion({
    currentBaselineVersionId: sourceBudget.currentBaselineVersionId,
    versions: sourceBudget.versions,
  });
  if (!baselineVersion || baselineVersion.id !== selectedSource.baselineVersionId) {
    throw new FinanceDomainError(
      "FINANCE_BUDGET_INVALID_COPY_SOURCE",
      "The selected prior-year baseline is not eligible for copy.",
    );
  }

  const baselineWithLines = sourceBudget.versions.find((v) => v.id === baselineVersion.id)!;

  const configuration = await db.financeConfiguration.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { baseCurrency: true },
  });
  const tenantCurrency = configuration?.baseCurrency?.trim().toUpperCase() ?? null;
  const sourceCurrency = baselineWithLines.baseCurrency?.trim().toUpperCase() ?? null;
  if (sourceCurrency && tenantCurrency && sourceCurrency !== tenantCurrency) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CURRENCY",
      "Prior-year copy requires the same organisation base currency. No automatic conversion is applied.",
    );
  }

  const linesToCopy: Array<{ financialAccountId: string; amountMinor: number }> = [];
  let excludedArchivedLineCount = 0;

  for (const line of baselineWithLines.lines) {
    if (line.financialAccount.lifecycle !== "ACTIVE") {
      excludedArchivedLineCount += 1;
      continue;
    }
    linesToCopy.push({
      financialAccountId: line.financialAccountId,
      amountMinor: line.amountMinor,
    });
  }

  try {
    const budget = await db.financeBudget.create({
      data: {
        tenantId: ctx.tenantId,
        financeYearId: input.targetFinanceYearId,
        createdByUserId: ctx.userId,
        versions: {
          create: {
            status: "DRAFT",
            versionNumber: 1,
            createdByUserId: ctx.userId,
            lines: {
              create: linesToCopy,
            },
          },
        },
      },
      include: {
        versions: {
          include: {
            lines: {
              include: {
                financialAccount: { select: { canonicalSemantic: true } },
              },
            },
          },
        },
      },
    });

    const workingVersion = budget.versions[0]!;
    const totals = computeBudgetPlanningTotals(workingVersion.lines);

    return {
      budgetId: budget.id,
      workingVersionId: workingVersion.id,
      summary: {
        mode: "COPY_FROM_PRIOR",
        sourceFinanceYearId: selectedSource.financeYearId,
        sourceBaselineVersionId: selectedSource.baselineVersionId,
        copiedLineCount: linesToCopy.length,
        excludedArchivedLineCount,
        totalIncomeMinor: totals.totalIncomeMinor,
        totalExpenseMinor: totals.totalExpenseMinor,
        resultMinor: totals.resultMinor,
      },
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new FinanceDomainError(
        "FINANCE_BUDGET_ALREADY_EXISTS",
        "A budget already exists for this financial year.",
        409,
      );
    }
    throw error;
  }
}

export async function createAnnualBudgetForYear(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    targetFinanceYearId: string;
    mode: AnnualBudgetCreationMode;
    sourceFinanceYearId?: string;
  },
): Promise<CreateAnnualBudgetResult> {
  if (typeof db.$transaction === "function") {
    return db.$transaction((tx) =>
      executeCreateAnnualBudget(tx as unknown as Db, ctx, input),
    );
  }
  return executeCreateAnnualBudget(db, ctx, input);
}
