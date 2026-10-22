import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FinanceSetupStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createFinanceYear } from "@/lib/finance/services/finance-year-service";
import {
  markFinanceSetupConfigured,
  setCurrentFinanceYear,
  setFinanceBaseCurrency,
} from "@/lib/finance/services/finance-configuration-service";
import { setFinanceCapabilityEnabled } from "@/lib/finance/services/finance-capability-service";
import { resolveTenantBudgetCurrency } from "@/lib/finance/services/finance-budget-service";
import { loadApprovedBudgetReportingReadModel } from "@/lib/finance/services/finance-reporting-query-service";
import { loadBudgetWorkspaceSnapshot } from "@/lib/finance/services/finance-budget-query-service";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

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
  years: [] as Array<{
    id: string;
    tenantId: string;
    name: string;
    startDate: Date;
    endDate: Date;
    status: "DRAFT";
    seasonId: null;
  }>,
  capabilities: [] as Array<{ id: string; tenantId: string; capability: string; enabled: boolean }>,
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
  budgets: [] as Array<{ id: string; tenantId: string; financeYearId: string }>,
  budgetVersions: [] as Array<{
    id: string;
    budgetId: string;
    status: "APPROVED";
    approvedAt: Date;
    approvedBy: null;
    lines: Array<{ financialAccountId: string; amountMinor: number }>;
  }>,
};

function adminCtx(tenantId: string) {
  return {
    tenantId,
    userId: "user-1",
    permissionKeys: new Set([
      PERMISSIONS.FINANCE_ADMIN,
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_STRUCTURE_MANAGE,
      PERMISSIONS.FINANCE_BUDGET_VIEW,
    ]),
  };
}

const db = {
  financeConfiguration: {
    findUnique: vi.fn(async ({ where: { tenantId } }: { where: { tenantId: string } }) =>
      store.configs.find((c) => c.tenantId === tenantId) ?? null,
    ),
    upsert: vi.fn(
      async ({
        where: { tenantId },
        create,
        update,
      }: {
        where: { tenantId: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        const idx = store.configs.findIndex((c) => c.tenantId === tenantId);
        if (idx === -1) {
          const row: ConfigRow = {
            id: `cfg-${store.configs.length + 1}`,
            tenantId,
            baseCurrency: null,
            setupStatus: "NOT_STARTED",
            currentFinanceYearId: null,
            appliedStructureTemplateKey: null,
            configuredAt: null,
            ...create,
          };
          store.configs.push(row);
          return row;
        }
        store.configs[idx] = { ...store.configs[idx]!, ...update };
        return store.configs[idx];
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { tenantId?: string; id?: string };
        data: Record<string, unknown>;
      }) => {
        const idx = store.configs.findIndex(
          (c) => c.tenantId === where.tenantId || c.id === where.id,
        );
        if (idx === -1) throw new Error("FinanceConfiguration not found");
        store.configs[idx] = { ...store.configs[idx]!, ...data };
        return store.configs[idx];
      },
    ),
  },
  financeYear: {
    count: vi.fn(async ({ where: { tenantId } }: { where: { tenantId: string } }) =>
      store.years.filter((y) => y.tenantId === tenantId).length,
    ),
    findMany: vi.fn(async ({ where: { tenantId } }: { where: { tenantId: string } }) =>
      store.years.filter((y) => y.tenantId === tenantId),
    ),
    findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
      store.years.find((y) => y.id === id) ?? null,
    ),
    create: vi.fn(
      async ({
        data,
      }: {
        data: {
          tenantId: string;
          name: string;
          startDate: Date;
          endDate: Date;
          status: "DRAFT";
          seasonId: null;
        };
      }) => {
        const row = { id: `year-${store.years.length + 1}`, ...data };
        store.years.push(row);
        return row;
      },
    ),
  },
  season: { findUnique: vi.fn(async () => null) },
  financeTenantCapability: {
    count: vi.fn(async () => 0),
    upsert: vi.fn(
      async ({
        where: { tenantId_capability },
        create,
        update,
      }: {
        where: { tenantId_capability: { tenantId: string; capability: string } };
        create: { tenantId: string; capability: string; enabled: boolean };
        update: { enabled: boolean };
      }) => {
        const idx = store.capabilities.findIndex(
          (c) =>
            c.tenantId === tenantId_capability.tenantId &&
            c.capability === tenantId_capability.capability,
        );
        if (idx === -1) {
          const row = {
            id: `cap-${store.capabilities.length + 1}`,
            ...create,
          };
          store.capabilities.push(row);
          return row;
        }
        store.capabilities[idx] = { ...store.capabilities[idx]!, ...update };
        return store.capabilities[idx];
      },
    ),
    findMany: vi.fn(async ({ where: { tenantId } }: { where: { tenantId: string } }) =>
      store.capabilities.filter((c) => c.tenantId === tenantId),
    ),
  },
  financialReportingGroup: {
    findMany: vi.fn(async ({ where: { tenantId } }: { where: { tenantId: string } }) =>
      store.groups.filter((g) => g.tenantId === tenantId),
    ),
  },
  financialAccount: {
    findMany: vi.fn(async ({ where: { tenantId } }: { where: { tenantId: string } }) =>
      store.accounts
        .filter((a) => a.tenantId === tenantId)
        .map((a) => ({ ...a, reportingGroup: store.groups.find((g) => g.id === a.reportingGroupId) })),
    ),
  },
  financeBudget: {
    findUnique: vi.fn(async () => null),
  },
};

beforeEach(() => {
  store.configs = [];
  store.years = [];
  store.capabilities = [];
  store.groups = [];
  store.accounts = [];
  store.budgets = [];
  store.budgetVersions = [];
  vi.clearAllMocks();
});

describe("FinanceConfiguration baseCurrency lifecycle (FIN-01E R2)", () => {
  async function seedCurrencyAndYear() {
    const ctx = adminCtx(tenantA);
    await setFinanceBaseCurrency(db, ctx, "EUR");
    await createFinanceYear(db, ctx, {
      name: "FY 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    });
    return ctx;
  }

  it("persists baseCurrency after FinanceYear creation", async () => {
    const ctx = adminCtx(tenantA);
    await setFinanceBaseCurrency(db, ctx, "EUR");
    await createFinanceYear(db, ctx, {
      name: "FY 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    });
    expect(store.configs[0]?.baseCurrency).toBe("EUR");
  });

  it("perserves baseCurrency when adding another finance year", async () => {
    const ctx = await seedCurrencyAndYear();
    await createFinanceYear(db, ctx, {
      name: "FY 2027",
      startDate: new Date("2027-01-01"),
      endDate: new Date("2027-12-31"),
    });
    expect(store.configs[0]?.baseCurrency).toBe("EUR");
  });

  it("preserves baseCurrency when changing current finance year", async () => {
    const ctx = await seedCurrencyAndYear();
    const second = await createFinanceYear(db, ctx, {
      name: "FY 2027",
      startDate: new Date("2027-01-01"),
      endDate: new Date("2027-12-31"),
    });
    await setCurrentFinanceYear(db, ctx, second.id);
    expect(store.configs[0]?.baseCurrency).toBe("EUR");
    expect(store.configs[0]?.currentFinanceYearId).toBe(second.id);
  });

  it("preserves baseCurrency after capability update", async () => {
    const ctx = await seedCurrencyAndYear();
    await setFinanceCapabilityEnabled(db, ctx, "OVERVIEW", true);
    expect(store.configs[0]?.baseCurrency).toBe("EUR");
  });

  it("preserves baseCurrency after setup completion", async () => {
    const ctx = await seedCurrencyAndYear();
    await markFinanceSetupConfigured(db, ctx);
    expect(store.configs[0]?.baseCurrency).toBe("EUR");
    expect(store.configs[0]?.setupStatus).toBe("CONFIGURED");
  });

  it("resolves the same canonical baseCurrency for budget and reporting", async () => {
    const ctx = await seedCurrencyAndYear();
    store.groups.push({
      id: "grp-1",
      tenantId: tenantA,
      name: "Income",
      parentId: null,
      sortOrder: 0,
      lifecycle: "ACTIVE",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    store.accounts.push({
      id: "acc-1",
      tenantId: tenantA,
      reportingGroupId: "grp-1",
      name: "Fees",
      canonicalSemantic: "INCOME",
      lifecycle: "ACTIVE",
      sortOrder: 0,
      archivedAt: null,
      nodeKind: "POSTING",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const budgetCurrency = await resolveTenantBudgetCurrency(db, ctx);
    const reporting = await loadApprovedBudgetReportingReadModel(db, ctx, null);

    expect(budgetCurrency).toBe("EUR");
    expect(reporting.baseCurrency).toBe("EUR");
  });

  it("reports missing baseCurrency prerequisite without inferring country fallback", async () => {
    const ctx = adminCtx(tenantA);
    store.configs.push({
      id: "cfg-1",
      tenantId: tenantA,
      baseCurrency: null,
      setupStatus: "IN_PROGRESS",
      currentFinanceYearId: null,
      appliedStructureTemplateKey: null,
      configuredAt: null,
    });
    store.years.push({
      id: "year-1",
      tenantId: tenantA,
      name: "FY 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      status: "DRAFT",
      seasonId: null,
    });

    const reporting = await loadApprovedBudgetReportingReadModel(db, ctx, null);
    expect(reporting.availability).toBe("NO_BASE_CURRENCY");
    expect(reporting.baseCurrency).toBeNull();

    const workspace = await loadBudgetWorkspaceSnapshot(db, ctx, "year-1");
    expect(workspace.baseCurrency).toBeNull();
  });

  it("scopes baseCurrency reads to the active tenant", async () => {
    store.configs.push(
      {
        id: "cfg-a",
        tenantId: tenantA,
        baseCurrency: "EUR",
        setupStatus: "IN_PROGRESS",
        currentFinanceYearId: null,
        appliedStructureTemplateKey: null,
        configuredAt: null,
      },
      {
        id: "cfg-b",
        tenantId: tenantB,
        baseCurrency: "USD",
        setupStatus: "IN_PROGRESS",
        currentFinanceYearId: null,
        appliedStructureTemplateKey: null,
        configuredAt: null,
      },
    );

    const currencyA = await resolveTenantBudgetCurrency(db, adminCtx(tenantA));
    const currencyB = await resolveTenantBudgetCurrency(db, adminCtx(tenantB));
    expect(currencyA).toBe("EUR");
    expect(currencyB).toBe("USD");
  });
});
