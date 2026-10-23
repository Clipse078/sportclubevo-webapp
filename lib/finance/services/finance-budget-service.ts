import type { FinanceBudgetVersionStatus, PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import { isBudgetVersionImmutable } from "@/lib/finance/finance-architecture";
import {
  requireFinanceBudgetApprove,
  requireFinanceBudgetManage,
  requireFinanceBudgetView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { evaluateBudgetApprovalReadiness } from "@/lib/finance/budget/budget-approval-readiness";
import { createAnnualBudgetForYear } from "@/lib/finance/services/finance-annual-budget-service";
import { resolveCurrentGovernanceBaselineVersion } from "@/lib/finance/budget/current-governance-baseline";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import "@/lib/finance/budget/budget-account-delete-guard";

type Db = Pick<
  PrismaClient,
  | "financeBudget"
  | "financeBudgetVersion"
  | "financeBudgetLine"
  | "financeYear"
  | "financialAccount"
  | "financeConfiguration"
  | "$transaction"
>;

const PLANNING_ACCOUNT_SEMANTICS = ["INCOME", "EXPENSE"] as const;

function mapVersionStatus(status: FinanceBudgetVersionStatus): "DRAFT" | "APPROVED" | "LOCKED" {
  if (status === "APPROVED") return "APPROVED";
  return "DRAFT";
}

function assertVersionEditable(status: FinanceBudgetVersionStatus): void {
  if (isBudgetVersionImmutable(mapVersionStatus(status))) {
    throw new FinanceDomainError(
      "FINANCE_BUDGET_IMMUTABLE",
      "Approved budget baselines cannot be edited.",
      409,
    );
  }
}

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

async function getAccountForBudgetOrThrow(
  db: Db,
  ctx: FinanceAuthContext,
  financialAccountId: string,
) {
  const account = await db.financialAccount.findUnique({ where: { id: financialAccountId } });
  if (!account) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial account not found.", 404);
  }
  assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");
  if (
    !(PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(account.canonicalSemantic)
  ) {
    throw new FinanceDomainError(
      "FINANCE_BUDGET_INVALID_ACCOUNT",
      "Budget lines must reference income or expense accounts.",
    );
  }
  return account;
}

async function getBudgetWithVersionsOrThrow(
  db: Db,
  ctx: FinanceAuthContext,
  budgetId: string,
) {
  const budget = await db.financeBudget.findUnique({
    where: { id: budgetId },
    include: { versions: { orderBy: { versionNumber: "desc" } } },
  });
  if (!budget) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Budget not found.", 404);
  }
  assertSameTenant(budget.tenantId, ctx.tenantId, "Budget");
  return budget;
}

async function getVersionOrThrow(db: Db, ctx: FinanceAuthContext, versionId: string) {
  const version = await db.financeBudgetVersion.findUnique({
    where: { id: versionId },
    include: { budget: true },
  });
  if (!version) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Budget version not found.", 404);
  }
  assertSameTenant(version.budget.tenantId, ctx.tenantId, "Budget");
  return version;
}

export async function getOrCreateDraftBudgetForYear(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
) {
  requireFinanceBudgetManage(ctx);
  await getFinanceYearOrThrow(db, ctx, financeYearId);

  const existing = await db.financeBudget.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    include: {
      versions: true,
      financeYear: true,
    },
  });

  if (existing) {
    const currentBaseline = resolveCurrentGovernanceBaselineVersion({
      currentBaselineVersionId: existing.currentBaselineVersionId ?? null,
      versions: existing.versions,
    });
    const approved = currentBaseline;
    const draft = existing.versions.find((v) => v.status === "DRAFT");
    if (approved && !draft) {
      throw new FinanceDomainError(
        "FINANCE_BUDGET_BASELINE_EXISTS",
        "An approved baseline already exists for this financial year.",
        409,
      );
    }
    if (draft) return { budget: existing, workingVersion: draft };
    if (approved) return { budget: existing, workingVersion: approved };
  }

  const created = await createAnnualBudgetForYear(db, ctx, {
    targetFinanceYearId: financeYearId,
    mode: "EMPTY",
  });

  const budget = await db.financeBudget.findUnique({
    where: {
      tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId },
    },
    include: {
      versions: true,
      financeYear: true,
    },
  });
  if (!budget) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Budget not found.", 404);
  }
  const workingVersion =
    budget.versions.find((v) => v.id === created.workingVersionId) ?? budget.versions[0]!;

  return { budget, workingVersion };
}

export async function loadBudgetForYear(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
) {
  requireFinanceBudgetView(ctx);
  await getFinanceYearOrThrow(db, ctx, financeYearId);

  const budget = await db.financeBudget.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    include: {
      financeYear: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          lines: {
            include: {
              financialAccount: {
                include: { reportingGroup: true },
              },
            },
          },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  return budget;
}

export async function upsertBudgetLine(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    budgetVersionId: string;
    financialAccountId: string;
    amountMinor: number;
  },
) {
  requireFinanceBudgetManage(ctx);
  assertSafeAmountMinor(input.amountMinor);

  const version = await getVersionOrThrow(db, ctx, input.budgetVersionId);
  assertVersionEditable(version.status);
  await getAccountForBudgetOrThrow(db, ctx, input.financialAccountId);

  return db.financeBudgetLine.upsert({
    where: {
      budgetVersionId_financialAccountId: {
        budgetVersionId: input.budgetVersionId,
        financialAccountId: input.financialAccountId,
      },
    },
    create: {
      budgetVersionId: input.budgetVersionId,
      financialAccountId: input.financialAccountId,
      amountMinor: input.amountMinor,
    },
    update: { amountMinor: input.amountMinor },
  });
}

export async function deleteBudgetLine(
  db: Db,
  ctx: FinanceAuthContext,
  lineId: string,
) {
  requireFinanceBudgetManage(ctx);
  const line = await db.financeBudgetLine.findUnique({
    where: { id: lineId },
    include: { budgetVersion: { include: { budget: true } } },
  });
  if (!line) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Budget line not found.", 404);
  }
  assertSameTenant(line.budgetVersion.budget.tenantId, ctx.tenantId, "Budget");
  assertVersionEditable(line.budgetVersion.status);

  await db.financeBudgetLine.delete({ where: { id: lineId } });
  return { deleted: true as const };
}

async function executeApproveBudgetVersion(
  db: Omit<Db, "$transaction">,
  ctx: FinanceAuthContext,
  budgetVersionId: string,
) {
  const version = await db.financeBudgetVersion.findUnique({
    where: { id: budgetVersionId },
    include: {
      budget: {
        include: {
          versions: { select: { id: true, status: true } },
        },
      },
      lines: {
        include: {
          financialAccount: {
            select: { lifecycle: true, canonicalSemantic: true },
          },
        },
      },
    },
  });
  if (!version) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Budget version not found.", 404);
  }
  assertSameTenant(version.budget.tenantId, ctx.tenantId, "Budget");

  if (version.budgetId !== version.budget.id) {
    throw new FinanceDomainError("FINANCE_BUDGET_NOT_READY", "Budget version mismatch.", 409);
  }

  const currentBaseline = resolveCurrentGovernanceBaselineVersion({
    currentBaselineVersionId: version.budget.currentBaselineVersionId,
    versions: version.budget.versions,
  });
  const approvalMode = currentBaseline ? "REBASELINE" : "FIRST_APPROVAL";

  const configuration = await db.financeConfiguration.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { baseCurrency: true },
  });
  const baseCurrency = configuration?.baseCurrency?.trim().toUpperCase() ?? null;

  const readiness = evaluateBudgetApprovalReadiness({
    mode: approvalMode,
    versionStatus: version.status === "APPROVED" ? "APPROVED" : "DRAFT",
    baseCurrency,
    lines: version.lines,
    currentBaselineExists: Boolean(currentBaseline),
  });

  if (!readiness.canApprove) {
    const primary = readiness.issues.find((issue) => issue.severity === "blocker");
    const code = primary?.code ?? "NO_PLANNED_LINES";
    if (code === "VERSION_NOT_DRAFT") {
      throw new FinanceDomainError(
        "FINANCE_BUDGET_IMMUTABLE",
        "Only draft budgets can be approved.",
        409,
      );
    }
    if (code === "APPROVED_BASELINE_ALREADY_EXISTS") {
      throw new FinanceDomainError(
        "FINANCE_BUDGET_BASELINE_EXISTS",
        "An approved baseline already exists for this financial year.",
        409,
      );
    }
    if (code === "NO_CURRENT_BASELINE_FOR_REBASELINE") {
      throw new FinanceDomainError(
        "FINANCE_BUDGET_NO_BASELINE",
        "Approve a baseline before re-baselining.",
        409,
      );
    }
    if (code === "BASE_CURRENCY_REQUIRED") {
      throw new FinanceDomainError(
        "FINANCE_INVALID_CURRENCY",
        "Configure organisation base currency before approving a budget baseline.",
      );
    }
    if (code === "NO_PLANNED_LINES") {
      throw new FinanceDomainError(
        "FINANCE_BUDGET_INVALID_AMOUNT",
        "Add at least one planned amount before approval.",
      );
    }
    throw new FinanceDomainError(
      "FINANCE_BUDGET_NOT_READY",
      "This budget is not ready for approval yet.",
    );
  }

  const frozenCurrency = baseCurrency!;
  const approvedAt = new Date();

  await db.financeBudgetVersion.update({
    where: { id: version.id, status: "DRAFT" },
    data: {
      status: "APPROVED",
      baseCurrency: frozenCurrency,
      approvedAt,
      approvedByUserId: ctx.userId,
    },
  });

  await db.financeBudget.update({
    where: { id: version.budgetId },
    data: { currentBaselineVersionId: version.id },
  });

  return db.financeBudgetVersion.findUnique({
    where: { id: version.id },
    include: {
      lines: true,
      approvedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function approveBudgetVersion(
  db: Db,
  ctx: FinanceAuthContext,
  budgetVersionId: string,
) {
  requireFinanceBudgetApprove(ctx);
  if (typeof db.$transaction === "function") {
    return db.$transaction(async (tx) =>
      executeApproveBudgetVersion(tx as Omit<Db, "$transaction">, ctx, budgetVersionId),
    );
  }
  return executeApproveBudgetVersion(db, ctx, budgetVersionId);
}

/**
 * After a baseline is approved, organisations may open a new working revision (FIN-02A).
 * The approved version remains the governance baseline for reporting until a future
 * re-baseline workflow supersedes it (FIN-02B+).
 */
export async function createWorkingBudgetRevision(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
) {
  requireFinanceBudgetManage(ctx);
  await getFinanceYearOrThrow(db, ctx, financeYearId);

  const budget = await db.financeBudget.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: { lines: true },
      },
    },
  });

  if (!budget) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Budget not found.", 404);
  }

  const approved =
    resolveCurrentGovernanceBaselineVersion({
      currentBaselineVersionId: budget.currentBaselineVersionId ?? null,
      versions: budget.versions,
    }) ?? null;
  if (!approved) {
    throw new FinanceDomainError(
      "FINANCE_BUDGET_NO_BASELINE",
      "Approve a baseline before starting a working revision.",
      409,
    );
  }

  const existingDraft = budget.versions.find((v) => v.status === "DRAFT") ?? null;
  if (existingDraft) {
    return { budget, workingVersion: existingDraft };
  }

  const nextVersionNumber = (budget.versions[0]?.versionNumber ?? 0) + 1;

  const workingVersion = await db.financeBudgetVersion.create({
    data: {
      budgetId: budget.id,
      status: "DRAFT",
      versionNumber: nextVersionNumber,
      createdByUserId: ctx.userId,
      lines: {
        create: approved.lines.map((line) => ({
          financialAccountId: line.financialAccountId,
          amountMinor: line.amountMinor,
        })),
      },
    },
    include: {
      lines: true,
    },
  });

  return { budget, workingVersion };
}

export async function deleteDraftBudgetWhenSafe(
  db: Db,
  ctx: FinanceAuthContext,
  budgetId: string,
) {
  requireFinanceBudgetManage(ctx);
  const budget = await getBudgetWithVersionsOrThrow(db, ctx, budgetId);
  const approved = budget.versions.some((v) => v.status === "APPROVED");
  if (approved) {
    throw new FinanceDomainError(
      "FINANCE_BUDGET_IMMUTABLE",
      "Approved budgets cannot be deleted.",
      409,
    );
  }

  await db.financeBudget.delete({ where: { id: budgetId } });
  return { deleted: true as const };
}

export type { BudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";
export { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";

export async function listFinanceYearsForBudget(
  db: Db,
  ctx: FinanceAuthContext,
) {
  requireFinanceBudgetView(ctx);
  return db.financeYear.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { startDate: "desc" },
  });
}

export async function resolveTenantBudgetCurrency(
  db: Db,
  ctx: FinanceAuthContext,
): Promise<string | null> {
  const config = await db.financeConfiguration.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { baseCurrency: true },
  });
  return config?.baseCurrency ?? null;
}
