import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FinanceSetupStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildIso4217CurrencyPickerOptions,
  filterIso4217CurrencyPickerOptions,
  getSupportedIso4217CurrencyCodes,
  isSupportedIso4217CurrencyCode,
} from "@/lib/finance/currency/iso4217-currency";
import {
  setFinanceBaseCurrency,
} from "@/lib/finance/services/finance-configuration-service";
import { resolveApprovedBudgetMeasure } from "@/lib/finance/reporting/approved-budget-measure-provider";
import { loadApprovedBudgetReportingReadModel } from "@/lib/finance/services/finance-reporting-query-service";

const tenantA = "tenant-a";

describe("ISO 4217 currency catalogue (FIN-01E R3)", () => {
  it("includes canonical CHF, EUR, and USD", () => {
    const codes = getSupportedIso4217CurrencyCodes();
    expect(codes).toContain("CHF");
    expect(codes).toContain("EUR");
    expect(codes).toContain("USD");
    expect(codes.length).toBeGreaterThan(100);
  });

  it("rejects arbitrary invalid codes", () => {
    expect(isSupportedIso4217CurrencyCode("CHF")).toBe(true);
    expect(isSupportedIso4217CurrencyCode("NOTVALID")).toBe(false);
    expect(isSupportedIso4217CurrencyCode("NOTAVALIDCODE")).toBe(false);
    expect(isSupportedIso4217CurrencyCode("12")).toBe(false);
  });

  it("supports search assistance for CH, CHF, US, USD, and Euro", () => {
    const options = buildIso4217CurrencyPickerOptions("de");
    expect(filterIso4217CurrencyPickerOptions(options, "chf").some((o) => o.value === "CHF")).toBe(
      true,
    );
    expect(filterIso4217CurrencyPickerOptions(options, "ch").some((o) => o.value === "CHF")).toBe(
      true,
    );
    expect(filterIso4217CurrencyPickerOptions(options, "usd").some((o) => o.value === "USD")).toBe(
      true,
    );
    expect(filterIso4217CurrencyPickerOptions(options, "us").some((o) => o.value === "USD")).toBe(
      true,
    );
    expect(filterIso4217CurrencyPickerOptions(options, "euro").some((o) => o.value === "EUR")).toBe(
      true,
    );
  });
});

describe("Finance base currency persistence and safety (FIN-01E R3)", () => {
  type ConfigRow = {
    id: string;
    tenantId: string;
    baseCurrency: string | null;
    setupStatus: FinanceSetupStatus;
    currentFinanceYearId: string | null;
    appliedStructureTemplateKey: string | null;
    configuredAt: Date | null;
  };

  const store = {
    configs: [] as ConfigRow[],
    years: [{ id: "year-1", tenantId: tenantA, name: "2026", startDate: new Date(), endDate: new Date() }],
    versions: [] as Array<{
      id: string;
      budgetId: string;
      status: "DRAFT" | "APPROVED";
      baseCurrency: string | null;
      budget: { tenantId: string };
    }>,
    budgets: [] as Array<{ id: string; tenantId: string; financeYearId: string }>,
    groups: [] as Array<{ id: string; tenantId: string; name: string; parentId: null; sortOrder: number; lifecycle: "ACTIVE"; archivedAt: null; createdAt: Date; updatedAt: Date }>,
    accounts: [] as Array<{
      id: string;
      tenantId: string;
      reportingGroupId: string;
      name: string;
      canonicalSemantic: "INCOME" | "EXPENSE";
      lifecycle: "ACTIVE";
      sortOrder: number;
      archivedAt: null;
      nodeKind: "POSTING";
      createdAt: Date;
      updatedAt: Date;
    }>,
    budgetVersions: [] as Array<{
      id: string;
      status: "APPROVED";
      baseCurrency: string | null;
      approvedAt: Date;
      lines: Array<{ financialAccountId: string; amountMinor: number }>;
    }>,
  };

  const db = {
    financeConfiguration: {
      findUnique: vi.fn(async ({ where: { tenantId } }: { where: { tenantId: string } }) =>
        store.configs.find((c) => c.tenantId === tenantId) ?? null,
      ),
      upsert: vi.fn(
        async ({
          where: { tenantId },
          create,
        }: {
          where: { tenantId: string };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const existing = store.configs.find((c) => c.tenantId === tenantId);
          if (existing) return existing;
          const row: ConfigRow = {
            id: "cfg-1",
            tenantId,
            baseCurrency: null,
            setupStatus: "NOT_STARTED",
            currentFinanceYearId: "year-1",
            appliedStructureTemplateKey: null,
            configuredAt: null,
            ...create,
          };
          store.configs.push(row);
          return row;
        },
      ),
      update: vi.fn(
        async ({
          where: { tenantId },
          data,
        }: {
          where: { tenantId: string };
          data: Record<string, unknown>;
        }) => {
          const idx = store.configs.findIndex((c) => c.tenantId === tenantA);
          store.configs[idx] = { ...store.configs[idx]!, ...data } as ConfigRow;
          return store.configs[idx];
        },
      ),
    },
    financeYear: {
      count: vi.fn(async () => store.years.length),
      findMany: vi.fn(async () => store.years),
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        store.years.find((y) => y.id === id) ?? null,
      ),
    },
    financeBudgetVersion: {
      count: vi.fn(
        async ({
          where,
        }: {
          where: { status?: string; budget?: { tenantId: string } };
        }) => {
          return store.versions.filter(
            (v) =>
              (!where.status || v.status === where.status) &&
              (!where.budget || v.budget.tenantId === where.budget.tenantId),
          ).length;
        },
      ),
    },
    financeBudget: {
      findUnique: vi.fn(async () => ({
        versions: store.budgetVersions,
      })),
    },
    financialReportingGroup: {
      findMany: vi.fn(async () => store.groups),
    },
    financialAccount: {
      findMany: vi.fn(async () => store.accounts),
    },
  };

  const adminCtx = {
    tenantId: tenantA,
    userId: "user-1",
    permissionKeys: new Set([
      PERMISSIONS.FINANCE_ADMIN,
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_BUDGET_MANAGE,
      PERMISSIONS.FINANCE_APPROVE,
    ]),
  };

  beforeEach(() => {
    store.configs = [
      {
        id: "cfg-1",
        tenantId: tenantA,
        baseCurrency: null,
        setupStatus: "IN_PROGRESS",
        currentFinanceYearId: "year-1",
        appliedStructureTemplateKey: null,
        configuredAt: null,
      },
    ];
    store.versions = [];
    store.budgetVersions = [];
    store.groups = [
      {
        id: "grp-1",
        tenantId: tenantA,
        name: "Root",
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
        id: "acc-income",
        tenantId: tenantA,
        reportingGroupId: "grp-1",
        name: "Income",
        canonicalSemantic: "INCOME",
        lifecycle: "ACTIVE",
        sortOrder: 0,
        archivedAt: null,
        nodeKind: "POSTING",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "acc-expense",
        tenantId: tenantA,
        reportingGroupId: "grp-1",
        name: "Expense",
        canonicalSemantic: "EXPENSE",
        lifecycle: "ACTIVE",
        sortOrder: 1,
        archivedAt: null,
        nodeKind: "POSTING",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    vi.clearAllMocks();
  });

  it("persists CHF on FinanceConfiguration", async () => {
    await setFinanceBaseCurrency(db, adminCtx, "CHF");
    expect(store.configs[0]?.baseCurrency).toBe("CHF");
  });

  it("blocks changing base currency when approved baselines exist", async () => {
    store.configs[0]!.baseCurrency = "CHF";
    store.versions.push({
      id: "v1",
      budgetId: "b1",
      status: "APPROVED",
      baseCurrency: "CHF",
      budget: { tenantId: tenantA },
    });
    await expect(setFinanceBaseCurrency(db, adminCtx, "EUR")).rejects.toMatchObject({
      code: "FINANCE_INVALID_CURRENCY",
    });
  });

  it("allows first-time base currency reconciliation when legacy approved baseline has no snapshot", async () => {
    store.versions.push({
      id: "v1",
      budgetId: "b1",
      status: "APPROVED",
      baseCurrency: null,
      budget: { tenantId: tenantA },
    });
    await setFinanceBaseCurrency(db, adminCtx, "CHF");
    expect(store.configs[0]?.baseCurrency).toBe("CHF");
  });

  it("reports approved baseline amounts when CHF is configured", async () => {
    store.configs[0]!.baseCurrency = "CHF";
    store.budgetVersions = [
      {
        id: "v-approved",
        status: "APPROVED",
        baseCurrency: null,
        approvedAt: new Date(),
        lines: [
          { financialAccountId: "acc-income", amountMinor: 150_000_00 },
          { financialAccountId: "acc-expense", amountMinor: 75_000_00 },
        ],
      },
    ];

    const model = await loadApprovedBudgetReportingReadModel(db, adminCtx, "year-1");
    expect(model.availability).toBe("AVAILABLE");
    expect(model.baseCurrency).toBe("CHF");
    expect(model.summary.incomeMinor).toBe(150_000_00);
    expect(model.summary.expenseMinor).toBe(75_000_00);
    expect(model.summary.resultMinor).toBe(75_000_00);
  });

});

describe("resolveApprovedBudgetMeasure currency context", () => {
  it("returns version base currency when present", () => {
    const measure = resolveApprovedBudgetMeasure([
      {
        id: "v1",
        status: "APPROVED",
        baseCurrency: "CHF",
        approvedAt: new Date(),
        lines: [{ financialAccountId: "a1", amountMinor: 100 }],
      },
    ]);
    expect(measure?.baseCurrency).toBe("CHF");
  });
});
