import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveApprovedBudgetMeasure } from "@/lib/finance/reporting/approved-budget-measure-provider";
import {
  buildFinancialReportingTree,
  summarizeReportingTree,
} from "@/lib/finance/reporting/build-reporting-tree";
import { computeCanonicalFinancialResult } from "@/lib/finance/reporting/canonical-financial-result";
import {
  resolveFinanceOverviewReportingSlice,
  shouldShowSubordinateSetupWorkflowNudge,
} from "@/lib/finance/reporting/reporting-overview-state";
import { resolveBudgetSelectedYearId } from "@/lib/finance/budget/resolve-budget-selected-year";
import { loadApprovedBudgetReportingReadModel } from "@/lib/finance/services/finance-reporting-query-service";

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const userId = "user-1";

function ctx(tenantId: string, permissions: string[]) {
  return {
    tenantId,
    userId,
    permissionKeys: new Set(permissions),
  };
}

describe("FIN-01E canonical financial result", () => {
  it("computes RESULT = INCOME - EXPENSE with integer minor units", () => {
    const result = computeCanonicalFinancialResult([
      { amountMinor: 100_00, canonicalSemantic: "INCOME" },
      { amountMinor: 40_00, canonicalSemantic: "EXPENSE" },
    ]);
    expect(result).toEqual({
      incomeMinor: 100_00,
      expenseMinor: 40_00,
      resultMinor: 60_00,
    });
  });

  it("handles zero and empty input safely", () => {
    expect(computeCanonicalFinancialResult([])).toEqual({
      incomeMinor: 0,
      expenseMinor: 0,
      resultMinor: 0,
    });
  });
});

describe("FIN-01E approved budget measure provider", () => {
  it("uses APPROVED version only and never DRAFT", () => {
    const measure = resolveApprovedBudgetMeasure([
      {
        id: "draft-1",
        status: "DRAFT",
        approvedAt: null,
        lines: [{ financialAccountId: "acc-1", amountMinor: 999_00 }],
      },
      {
        id: "approved-1",
        status: "APPROVED",
        approvedAt: new Date("2027-06-01"),
        lines: [{ financialAccountId: "acc-1", amountMinor: 50_00 }],
      },
    ]);
    expect(measure?.budgetVersionId).toBe("approved-1");
    expect(measure?.valuesByAccountId.get("acc-1")).toBe(50_00);
  });

  it("returns null when no approved baseline exists", () => {
    expect(
      resolveApprovedBudgetMeasure([
        {
          id: "draft-1",
          status: "DRAFT",
          approvedAt: null,
          lines: [{ financialAccountId: "acc-1", amountMinor: 10_00 }],
        },
      ]),
    ).toBeNull();
  });
});

describe("FIN-01E reporting tree", () => {
  const groups = [
    {
      id: "g-income",
      tenantId: tenantA,
      name: "Income root",
      parentId: null,
      sortOrder: 0,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "g-fees",
      tenantId: tenantA,
      name: "Fees",
      parentId: "g-income",
      sortOrder: 0,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "g-expense",
      tenantId: tenantA,
      name: "Expense root",
      parentId: null,
      sortOrder: 1,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const accounts = [
    {
      id: "acc-fees",
      tenantId: tenantA,
      reportingGroupId: "g-fees",
      name: "Membership",
      sortOrder: 0,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      canonicalSemantic: "INCOME" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "acc-staff",
      tenantId: tenantA,
      reportingGroupId: "g-expense",
      name: "Staff",
      sortOrder: 0,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      canonicalSemantic: "EXPENSE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it("builds nested groups with deterministic ordering and aggregates totals", () => {
    const values = new Map([
      ["acc-fees", 120_00],
      ["acc-staff", 30_00],
    ]);
    const tree = buildFinancialReportingTree({ groups, accounts, valuesByAccountId: values });
    expect(tree).toHaveLength(2);
    expect(tree[0]?.kind).toBe("reporting_group");
    if (tree[0]?.kind === "reporting_group") {
      expect(tree[0].incomeMinor).toBe(120_00);
      expect(tree[0].children[0]?.kind).toBe("reporting_group");
    }
    const summary = summarizeReportingTree(tree);
    expect(summary.incomeMinor).toBe(120_00);
    expect(summary.expenseMinor).toBe(30_00);
  });

  it("does not double-count account values across hierarchy levels", () => {
    const values = new Map([["acc-fees", 10_00], ["acc-staff", 5_00]]);
    const tree = buildFinancialReportingTree({ groups, accounts, valuesByAccountId: values });
    const summary = summarizeReportingTree(tree);
    expect(summary.incomeMinor - summary.expenseMinor).toBe(5_00);
  });

  it("represents renamed archived accounts with stable ids and historical amounts", () => {
    const archivedAccounts = [
      {
        ...accounts[0]!,
        name: "Former membership label",
        lifecycle: "ARCHIVED" as const,
        archivedAt: new Date("2027-01-01"),
      },
    ];
    const tree = buildFinancialReportingTree({
      groups,
      accounts: [...archivedAccounts, accounts[1]!],
      valuesByAccountId: new Map([
        ["acc-fees", 15_00],
        ["acc-staff", 0],
      ]),
    });
    const incomeGroup = tree[0];
    expect(incomeGroup?.kind).toBe("reporting_group");
    const nested =
      incomeGroup?.kind === "reporting_group" ? incomeGroup.children[0] : null;
    const leaf =
      nested?.kind === "reporting_group"
        ? nested.children.find((c) => c.kind === "account")
        : null;
    expect(leaf?.kind).toBe("account");
    if (leaf?.kind === "account") {
      expect(leaf.accountId).toBe("acc-fees");
      expect(leaf.name).toBe("Former membership label");
      expect(leaf.amountMinor).toBe(15_00);
    }
  });
});

describe("FIN-01E reporting query service", () => {
  const store = {
    years: [
      {
        id: "year-1",
        tenantId: tenantA,
        name: "FY2027",
        startDate: new Date("2027-01-01"),
        endDate: new Date("2027-12-31"),
      },
    ],
    groups: [] as Array<{ id: string; tenantId: string; name: string; parentId: string | null; sortOrder: number; lifecycle: "ACTIVE"; archivedAt: null; createdAt: Date; updatedAt: Date }>,
    accounts: [] as Array<{
      id: string;
      tenantId: string;
      reportingGroupId: string;
      name: string;
      sortOrder: number;
      lifecycle: "ACTIVE";
      archivedAt: null;
      canonicalSemantic: "INCOME" | "EXPENSE";
      createdAt: Date;
      updatedAt: Date;
    }>,
    budgets: [] as Array<{ id: string; tenantId: string; financeYearId: string }>,
    versions: [] as Array<{
      id: string;
      budgetId: string;
      status: "DRAFT" | "APPROVED";
      approvedAt: Date | null;
      lines: Array<{ financialAccountId: string; amountMinor: number }>;
    }>,
    config: { tenantId: tenantA, baseCurrency: "EUR", currentFinanceYearId: "year-1" },
  };

  const db = {
    financeConfiguration: {
      findUnique: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
        where.tenantId === store.config.tenantId ? store.config : null,
      ),
    },
    financeYear: {
      findMany: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
        store.years.filter((y) => y.tenantId === where.tenantId),
      ),
    },
    financialReportingGroup: {
      findMany: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
        store.groups.filter((g) => g.tenantId === where.tenantId),
      ),
    },
    financialAccount: {
      findMany: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
        store.accounts.filter((a) => a.tenantId === where.tenantId),
      ),
    },
    financeBudget: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { tenantId_financeYearId: { tenantId: string; financeYearId: string } };
        }) => {
          const budget = store.budgets.find(
            (b) =>
              b.tenantId === where.tenantId_financeYearId.tenantId &&
              b.financeYearId === where.tenantId_financeYearId.financeYearId,
          );
          if (!budget) return null;
          return {
            ...budget,
            versions: store.versions
              .filter((v) => v.budgetId === budget.id)
              .map((v) => ({ ...v, lines: v.lines })),
          };
        },
      ),
    },
  };

  beforeEach(() => {
    store.config = { tenantId: tenantA, baseCurrency: "EUR", currentFinanceYearId: "year-1" };
    store.years = [
      {
        id: "year-1",
        tenantId: tenantA,
        name: "FY2027",
        startDate: new Date("2027-01-01"),
        endDate: new Date("2027-12-31"),
      },
    ];
    store.groups = [
      {
        id: "g1",
        tenantId: tenantA,
        name: "Income",
        parentId: null,
        sortOrder: 0,
        lifecycle: "ACTIVE",
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    store.accounts = [
      {
        id: "acc-1",
        tenantId: tenantA,
        reportingGroupId: "g1",
        name: "Fees",
        sortOrder: 0,
        lifecycle: "ACTIVE",
        archivedAt: null,
        canonicalSemantic: "INCOME",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    store.budgets = [{ id: "b1", tenantId: tenantA, financeYearId: "year-1" }];
    store.versions = [
      {
        id: "v-draft",
        budgetId: "b1",
        status: "DRAFT",
        approvedAt: null,
        lines: [{ financialAccountId: "acc-1", amountMinor: 999_00 }],
      },
      {
        id: "v-approved",
        budgetId: "b1",
        status: "APPROVED",
        approvedAt: new Date(),
        lines: [{ financialAccountId: "acc-1", amountMinor: 80_00 }],
      },
    ];
  });

  it("returns approved baseline reporting for tenant and finance year with base currency", async () => {
    const model = await loadApprovedBudgetReportingReadModel(
      db as never,
      ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      "year-1",
    );
    expect(model.availability).toBe("AVAILABLE");
    expect(model.financeYearId).toBe("year-1");
    expect(model.baseCurrency).toBe("EUR");
    expect(model.summary.incomeMinor).toBe(80_00);
    expect(model.approvedBudgetVersionId).toBe("v-approved");
    expect(model.reportingContextKey).toContain("APPROVED_BUDGET:v-approved");
  });

  it("never aggregates tenant B budget values for tenant A", async () => {
    store.budgets.push({ id: "b-tenant-b", tenantId: tenantB, financeYearId: "year-b" });
    store.versions.push({
      id: "v-b",
      budgetId: "b-tenant-b",
      status: "APPROVED",
      approvedAt: new Date(),
      lines: [{ financialAccountId: "acc-1", amountMinor: 999_00 }],
    });
    const model = await loadApprovedBudgetReportingReadModel(
      db as never,
      ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      "year-1",
    );
    expect(model.summary.incomeMinor).toBe(80_00);
  });

  it("requires finance.view permission", async () => {
    await expect(
      loadApprovedBudgetReportingReadModel(db as never, ctx(tenantA, []), "year-1"),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });

  it("reports NO_APPROVED_BASELINE when only draft exists", async () => {
    store.versions = store.versions.filter((v) => v.status === "DRAFT");
    const model = await loadApprovedBudgetReportingReadModel(
      db as never,
      ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      "year-1",
    );
    expect(model.availability).toBe("NO_APPROVED_BASELINE");
    expect(model.summary.incomeMinor).toBe(0);
  });

  it("reports NO_BASE_CURRENCY before finance year resolution", async () => {
    store.config = { ...store.config, baseCurrency: null as unknown as string };
    const model = await loadApprovedBudgetReportingReadModel(
      db as never,
      ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      "year-1",
    );
    expect(model.availability).toBe("NO_BASE_CURRENCY");
  });

  it("does not leak approved baseline from another finance year", async () => {
    store.years.push({
      id: "year-2",
      tenantId: tenantA,
      name: "FY2028",
      startDate: new Date("2028-01-01"),
      endDate: new Date("2028-12-31"),
    });
    store.budgets.push({ id: "b2", tenantId: tenantA, financeYearId: "year-2" });
    store.versions.push({
      id: "v-year2",
      budgetId: "b2",
      status: "APPROVED",
      approvedAt: new Date(),
      lines: [{ financialAccountId: "acc-1", amountMinor: 500_00 }],
    });
    const model = await loadApprovedBudgetReportingReadModel(
      db as never,
      ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      "year-1",
    );
    expect(model.financeYearId).toBe("year-1");
    expect(model.summary.incomeMinor).toBe(80_00);
  });
});

function approvedReportingFixture(
  overrides: Partial<{
    availability: "AVAILABLE" | "NO_APPROVED_BASELINE";
    incomeMinor: number;
    expenseMinor: number;
    resultMinor: number;
  }> = {},
) {
  return {
    tenantId: tenantA,
    financeYearId: "year-1",
    financeYearName: "FY2027",
    measure: "APPROVED_BUDGET" as const,
    mode: "LIVE" as const,
    baseCurrency: "EUR",
    availability: overrides.availability ?? ("AVAILABLE" as const),
    reportingContextKey: "ctx-1",
    approvedBudgetVersionId: "v-approved",
    approvedAt: new Date(),
    tree: [],
    summary: {
      incomeMinor: overrides.incomeMinor ?? 100_00,
      expenseMinor: overrides.expenseMinor ?? 40_00,
      resultMinor: overrides.resultMinor ?? 60_00,
    },
  };
}

describe("FIN-01E overview reporting slice", () => {
  it("never shows approved summary when baseline is absent", () => {
    const slice = resolveFinanceOverviewReportingSlice({
      reporting: {
        ...approvedReportingFixture(),
        availability: "NO_APPROVED_BASELINE",
        reportingContextKey: null,
        approvedBudgetVersionId: null,
        approvedAt: null,
        summary: { incomeMinor: 0, expenseMinor: 0, resultMinor: 0 },
      },
    });
    expect(slice.kind).toBe("NO_APPROVED_BASELINE");
  });

  it("shows approved reporting when setup workflow flag would still be incomplete", () => {
    const slice = resolveFinanceOverviewReportingSlice({
      reporting: approvedReportingFixture(),
    });
    expect(slice.kind).toBe("APPROVED_BASELINE");
    if (slice.kind === "APPROVED_BASELINE") {
      expect(slice.incomeMinor).toBe(100_00);
      expect(slice.expenseMinor).toBe(40_00);
      expect(slice.resultMinor).toBe(60_00);
    }
  });

  it("maps prerequisite availability to focused nudges", () => {
    expect(
      resolveFinanceOverviewReportingSlice({
        reporting: {
          ...approvedReportingFixture(),
          availability: "NO_BASE_CURRENCY",
          baseCurrency: null,
        },
      }).kind,
    ).toBe("NO_BASE_CURRENCY");
    expect(
      resolveFinanceOverviewReportingSlice({
        reporting: {
          ...approvedReportingFixture(),
          availability: "NO_FINANCE_YEAR",
          financeYearId: null,
          financeYearName: null,
        },
      }).kind,
    ).toBe("NO_FINANCE_YEAR");
    expect(
      resolveFinanceOverviewReportingSlice({
        reporting: {
          ...approvedReportingFixture(),
          availability: "NO_STRUCTURE",
        },
      }).kind,
    ).toBe("NO_STRUCTURE");
  });

  it("surfaces subordinate setup nudge only when reporting is available but workflow open", () => {
    expect(
      shouldShowSubordinateSetupWorkflowNudge({
        overviewState: "SETUP_INCOMPLETE",
        reporting: resolveFinanceOverviewReportingSlice({
          reporting: approvedReportingFixture(),
        }),
      }),
    ).toBe(true);
    expect(
      shouldShowSubordinateSetupWorkflowNudge({
        overviewState: "CONFIGURED_WITH_CAPABILITIES",
        reporting: resolveFinanceOverviewReportingSlice({
          reporting: approvedReportingFixture(),
        }),
      }),
    ).toBe(false);
  });
});

describe("FIN-01E overview year resolution consistency", () => {
  it("matches budget default year when overview passes no explicit year", () => {
    const years = [
      { id: "year-1", status: "ACTIVE" as const },
      { id: "year-2", status: "ACTIVE" as const },
    ];
    const currentFinanceYearId = "year-1";
    const overviewYear = resolveBudgetSelectedYearId({
      requestedYearId: null,
      years,
      currentFinanceYearId,
    });
    const budgetDefaultYear = resolveBudgetSelectedYearId({
      requestedYearId: null,
      years,
      currentFinanceYearId,
    });
    expect(overviewYear).toBe(budgetDefaultYear);
    expect(overviewYear).toBe("year-1");
  });
});
