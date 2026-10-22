import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  approveBudgetVersion,
  computeBudgetPlanningTotals,
  deleteBudgetLine,
  deleteDraftBudgetWhenSafe,
  getOrCreateDraftBudgetForYear,
  upsertBudgetLine,
} from "@/lib/finance/services/finance-budget-service";
import { deleteFinancialAccountWhenSafe } from "@/lib/finance/services/financial-account-service";
import {
  registerFinancialStructureDeleteGuard,
  resetFinancialStructureDeleteGuardsForTests,
} from "@/lib/finance/structure/delete-guards";
import "@/lib/finance/budget/budget-account-delete-guard";

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const userId = "user-1";

const store = {
  years: [] as Array<{ id: string; tenantId: string; name: string }>,
  accounts: [] as Array<{
    id: string;
    tenantId: string;
    reportingGroupId: string;
    name: string;
    canonicalSemantic: "INCOME" | "EXPENSE";
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>,
  budgets: [] as Array<{ id: string; tenantId: string; financeYearId: string }>,
  versions: [] as Array<{
    id: string;
    budgetId: string;
    status: "DRAFT" | "APPROVED";
    approvedAt: Date | null;
    approvedByUserId: string | null;
  }>,
  lines: [] as Array<{
    id: string;
    budgetVersionId: string;
    financialAccountId: string;
    amountMinor: number;
  }>,
  configs: [] as Array<{ tenantId: string; baseCurrency: string | null }>,
};

function ctx(tenantId: string, permissions: string[]) {
  return {
    tenantId,
    userId,
    permissionKeys: new Set(permissions),
  };
}

const db = {
  financeYear: {
    findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
      store.years.find((y) => y.id === id) ?? null,
    ),
    findMany: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
      store.years.filter((y) => y.tenantId === where.tenantId),
    ),
  },
  financialAccount: {
    findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
      store.accounts.find((a) => a.id === id) ?? null,
    ),
    findMany: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
      store.accounts.filter((a) => a.tenantId === where.tenantId),
    ),
    delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
      store.accounts = store.accounts.filter((a) => a.id !== id);
    }),
  },
  financeBudget: {
    findMany: vi.fn(),
    findUnique: vi.fn(
      async ({
        where,
        include,
      }: {
        where: { id?: string; tenantId_financeYearId?: { tenantId: string; financeYearId: string } };
        include?: { versions?: unknown; financeYear?: unknown };
      }) => {
        let budget =
          where.id != null
            ? store.budgets.find((b) => b.id === where.id)
            : where.tenantId_financeYearId
              ? store.budgets.find(
                  (b) =>
                    b.tenantId === where.tenantId_financeYearId!.tenantId &&
                    b.financeYearId === where.tenantId_financeYearId!.financeYearId,
                )
              : undefined;
        if (!budget) return null;
        if (include?.versions) {
          budget = {
            ...budget,
            versions: store.versions.filter((v) => v.budgetId === budget!.id),
            financeYear: store.years.find((y) => y.id === budget!.financeYearId),
          } as typeof budget;
        }
        return budget;
      },
    ),
    create: vi.fn(async ({ data, include }: { data: Record<string, unknown>; include?: unknown }) => {
      const budget = {
        id: `budget-${store.budgets.length + 1}`,
        tenantId: data.tenantId as string,
        financeYearId: data.financeYearId as string,
      };
      store.budgets.push(budget);
      const version = {
        id: `ver-${store.versions.length + 1}`,
        budgetId: budget.id,
        status: "DRAFT" as const,
        approvedAt: null,
        approvedByUserId: null,
      };
      store.versions.push(version);
      const payload = { ...budget, versions: [version] };
      return include ? payload : budget;
    }),
    delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
      store.budgets = store.budgets.filter((b) => b.id !== id);
    }),
  },
  financeBudgetVersion: {
    findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
      const version = store.versions.find((v) => v.id === id);
      if (!version) return null;
      const budget = store.budgets.find((b) => b.id === version.budgetId)!;
      return { ...version, budget };
    }),
    findFirst: vi.fn(
      async ({
        where,
      }: {
        where: { budgetId: string; status: string; id?: { not: string } };
      }) => {
        return (
          store.versions.find(
            (v) =>
              v.budgetId === where.budgetId &&
              v.status === where.status &&
              (!where.id || v.id !== where.id.not),
          ) ?? null
        );
      },
    ),
    update: vi.fn(
      async ({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const idx = store.versions.findIndex((v) => v.id === id);
        store.versions[idx] = { ...store.versions[idx]!, ...data } as (typeof store.versions)[number];
        return store.versions[idx];
      },
    ),
  },
  financeBudgetLine: {
    findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
      const line = store.lines.find((l) => l.id === id);
      if (!line) return null;
      const budgetVersion = store.versions.find((v) => v.id === line.budgetVersionId)!;
      const budget = store.budgets.find((b) => b.id === budgetVersion.budgetId)!;
      return { ...line, budgetVersion: { ...budgetVersion, budget } };
    }),
    count: vi.fn(async ({ where }: { where: { budgetVersionId?: string; financialAccountId?: string } }) => {
      return store.lines.filter((line) => {
        if (where.budgetVersionId && line.budgetVersionId !== where.budgetVersionId) return false;
        if (where.financialAccountId && line.financialAccountId !== where.financialAccountId) return false;
        return true;
      }).length;
    }),
    upsert: vi.fn(
      async ({
        where,
        create,
        update,
      }: {
        where: {
          budgetVersionId_financialAccountId: {
            budgetVersionId: string;
            financialAccountId: string;
          };
        };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        const key = where.budgetVersionId_financialAccountId;
        const existing = store.lines.find(
          (l) =>
            l.budgetVersionId === key.budgetVersionId &&
            l.financialAccountId === key.financialAccountId,
        );
        if (existing) {
          existing.amountMinor = update.amountMinor as number;
          return existing;
        }
        const row = {
          id: `line-${store.lines.length + 1}`,
          budgetVersionId: key.budgetVersionId,
          financialAccountId: key.financialAccountId,
          amountMinor: create.amountMinor as number,
        };
        store.lines.push(row);
        return row;
      },
    ),
    delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
      store.lines = store.lines.filter((l) => l.id !== id);
    }),
  },
  financeConfiguration: {
    findUnique: vi.fn(async ({ where: { tenantId } }: { where: { tenantId: string } }) =>
      store.configs.find((c) => c.tenantId === tenantId) ?? null,
    ),
  },
};

describe("FIN-01D budget foundation", () => {
  beforeEach(() => {
    store.years = [{ id: "year-a", tenantId: tenantA, name: "FY 2027" }];
    store.accounts = [
      {
        id: "acc-income",
        tenantId: tenantA,
        reportingGroupId: "grp-1",
        name: "Membership",
        canonicalSemantic: "INCOME",
        lifecycle: "ACTIVE",
      },
      {
        id: "acc-expense",
        tenantId: tenantA,
        reportingGroupId: "grp-1",
        name: "Personnel",
        canonicalSemantic: "EXPENSE",
        lifecycle: "ACTIVE",
      },
    ];
    store.budgets = [];
    store.versions = [];
    store.lines = [];
    store.configs = [{ tenantId: tenantA, baseCurrency: "EUR" }];
    vi.clearAllMocks();
    resetFinancialStructureDeleteGuardsForTests();
    registerFinancialStructureDeleteGuard(async (guardCtx) => {
      if (guardCtx.entityType !== "FinancialAccount") return { allowed: true };
      const count = store.lines.filter((l) => l.financialAccountId === guardCtx.entityId).length;
      return count > 0
        ? { allowed: false, reason: "Account referenced by budget line." }
        : { allowed: true };
    });
  });

  it("creates draft budget with tenant ownership and finance year association", async () => {
    const auth = ctx(tenantA, [PERMISSIONS.FINANCE_BUDGET_MANAGE]);
    const { workingVersion } = await getOrCreateDraftBudgetForYear(db, auth, "year-a");
    expect(workingVersion.status).toBe("DRAFT");
    expect(store.budgets[0]?.tenantId).toBe(tenantA);
    expect(store.budgets[0]?.financeYearId).toBe("year-a");
  });

  it("stores monetary amounts as integer minor units", async () => {
    const auth = ctx(tenantA, [PERMISSIONS.FINANCE_BUDGET_MANAGE]);
    const { workingVersion } = await getOrCreateDraftBudgetForYear(db, auth, "year-a");
    await upsertBudgetLine(db, auth, {
      budgetVersionId: workingVersion.id,
      financialAccountId: "acc-income",
      amountMinor: 5_000_000,
    });
    expect(store.lines[0]?.amountMinor).toBe(5_000_000);
  });

  it("blocks cross-tenant finance year", async () => {
    const auth = ctx(tenantB, [PERMISSIONS.FINANCE_BUDGET_MANAGE]);
    await expect(getOrCreateDraftBudgetForYear(db, auth, "year-a")).rejects.toMatchObject({
      code: "FINANCE_CROSS_TENANT",
    });
  });

  it("blocks cross-tenant account on line upsert", async () => {
    store.accounts.push({
      id: "acc-b",
      tenantId: tenantB,
      reportingGroupId: "grp-b",
      name: "Other",
      canonicalSemantic: "INCOME",
      lifecycle: "ACTIVE",
    });
    const auth = ctx(tenantA, [PERMISSIONS.FINANCE_BUDGET_MANAGE]);
    const { workingVersion } = await getOrCreateDraftBudgetForYear(db, auth, "year-a");
    await expect(
      upsertBudgetLine(db, auth, {
        budgetVersionId: workingVersion.id,
        financialAccountId: "acc-b",
        amountMinor: 100,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });
  });

  it("approves draft with attribution and protects lines", async () => {
    const manage = ctx(tenantA, [PERMISSIONS.FINANCE_BUDGET_MANAGE, PERMISSIONS.FINANCE_APPROVE]);
    const { workingVersion } = await getOrCreateDraftBudgetForYear(db, manage, "year-a");
    await upsertBudgetLine(db, manage, {
      budgetVersionId: workingVersion.id,
      financialAccountId: "acc-income",
      amountMinor: 1000,
    });
    const approved = await approveBudgetVersion(db, manage, workingVersion.id);
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedByUserId).toBe(userId);

    await expect(
      upsertBudgetLine(db, manage, {
        budgetVersionId: workingVersion.id,
        financialAccountId: "acc-expense",
        amountMinor: 500,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_BUDGET_IMMUTABLE" });
  });

  it("blocks unauthorized approval", async () => {
    const manageOnly = ctx(tenantA, [PERMISSIONS.FINANCE_BUDGET_MANAGE]);
    const { workingVersion } = await getOrCreateDraftBudgetForYear(db, manageOnly, "year-a");
    await upsertBudgetLine(db, manageOnly, {
      budgetVersionId: workingVersion.id,
      financialAccountId: "acc-income",
      amountMinor: 100,
    });
    await expect(approveBudgetVersion(db, manageOnly, workingVersion.id)).rejects.toMatchObject({
      code: "FINANCE_FORBIDDEN",
    });
  });

  it("enforces one approved baseline per financial year", async () => {
    const auth = ctx(tenantA, [PERMISSIONS.FINANCE_BUDGET_MANAGE, PERMISSIONS.FINANCE_APPROVE]);
    const first = await getOrCreateDraftBudgetForYear(db, auth, "year-a");
    await upsertBudgetLine(db, auth, {
      budgetVersionId: first.workingVersion.id,
      financialAccountId: "acc-income",
      amountMinor: 100,
    });
    await approveBudgetVersion(db, auth, first.workingVersion.id);
    await expect(getOrCreateDraftBudgetForYear(db, auth, "year-a")).rejects.toMatchObject({
      code: "FINANCE_BUDGET_BASELINE_EXISTS",
    });
  });

  it("blocks destructive account delete when referenced by budget", async () => {
    const auth = ctx(tenantA, [
      PERMISSIONS.FINANCE_BUDGET_MANAGE,
      PERMISSIONS.FINANCE_STRUCTURE_MANAGE,
    ]);
    const { workingVersion } = await getOrCreateDraftBudgetForYear(db, auth, "year-a");
    await upsertBudgetLine(db, auth, {
      budgetVersionId: workingVersion.id,
      financialAccountId: "acc-income",
      amountMinor: 250,
    });
    await expect(deleteFinancialAccountWhenSafe(db, auth, "acc-income")).rejects.toMatchObject({
      code: "FINANCE_UNSAFE_DELETE",
    });
  });

  it("allows draft line delete and draft budget delete", async () => {
    const auth = ctx(tenantA, [PERMISSIONS.FINANCE_BUDGET_MANAGE]);
    const { budget, workingVersion } = await getOrCreateDraftBudgetForYear(db, auth, "year-a");
    const line = await upsertBudgetLine(db, auth, {
      budgetVersionId: workingVersion.id,
      financialAccountId: "acc-income",
      amountMinor: 100,
    });
    await deleteBudgetLine(db, auth, line.id);
    expect(store.lines).toHaveLength(0);
    await deleteDraftBudgetWhenSafe(db, auth, budget.id);
    expect(store.budgets).toHaveLength(0);
  });

  it("computes income/expense totals", () => {
    const totals = computeBudgetPlanningTotals([
      { amountMinor: 50000, financialAccount: { canonicalSemantic: "INCOME" } },
      { amountMinor: 20000, financialAccount: { canonicalSemantic: "EXPENSE" } },
    ]);
    expect(totals.totalIncomeMinor).toBe(50000);
    expect(totals.totalExpenseMinor).toBe(20000);
    expect(totals.resultMinor).toBe(30000);
  });

  it("requires budget manage permission for mutations", async () => {
    const viewOnly = ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]);
    await expect(getOrCreateDraftBudgetForYear(db, viewOnly, "year-a")).rejects.toMatchObject({
      code: "FINANCE_FORBIDDEN",
    });
  });
});
