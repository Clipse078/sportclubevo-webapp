import type { FinanceBudgetVersionStatus, PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import { isBudgetVersionImmutable } from "@/lib/finance/finance-architecture";
import {
  requireFinanceBudgetApprove,
  requireFinanceBudgetManage,
  requireFinanceBudgetView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
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
    const approved = existing.versions.find((v) => v.status === "APPROVED");
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

  const budget = await db.financeBudget.create({
    data: {
      tenantId: ctx.tenantId,
      financeYearId,
      createdByUserId: ctx.userId,
      versions: {
        create: {
          status: "DRAFT",
          versionNumber: 1,
          createdByUserId: ctx.userId,
        },
      },
    },
    include: {
      versions: true,
      financeYear: true,
    },
  });

  return { budget, workingVersion: budget.versions[0]! };
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

export async function approveBudgetVersion(
  db: Db,
  ctx: FinanceAuthContext,
  budgetVersionId: string,
) {
  requireFinanceBudgetApprove(ctx);
  const version = await getVersionOrThrow(db, ctx, budgetVersionId);
  if (version.status !== "DRAFT") {
    throw new FinanceDomainError(
      "FINANCE_BUDGET_IMMUTABLE",
      "Only draft budgets can be approved.",
      409,
    );
  }

  const siblingApproved = await db.financeBudgetVersion.findFirst({
    where: { budgetId: version.budgetId, status: "APPROVED", id: { not: version.id } },
  });
  if (siblingApproved) {
    throw new FinanceDomainError(
      "FINANCE_BUDGET_BASELINE_EXISTS",
      "An approved baseline already exists for this financial year.",
      409,
    );
  }

  const lineCount = await db.financeBudgetLine.count({
    where: { budgetVersionId: version.id },
  });
  if (lineCount === 0) {
    throw new FinanceDomainError(
      "FINANCE_BUDGET_INVALID_AMOUNT",
      "Add at least one planned amount before approval.",
    );
  }

  const configuration = await db.financeConfiguration.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { baseCurrency: true },
  });
  const baseCurrency = configuration?.baseCurrency?.trim().toUpperCase() ?? null;
  if (!baseCurrency) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CURRENCY",
      "Configure organisation base currency before approving a budget baseline.",
    );
  }

  return db.financeBudgetVersion.update({
    where: { id: version.id },
    data: {
      status: "APPROVED",
      baseCurrency,
      approvedAt: new Date(),
      approvedByUserId: ctx.userId,
    },
    include: {
      lines: true,
      approvedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
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
