import { describe, expect, it, vi, beforeEach } from "vitest";
import type { FinanceYear } from "@prisma/client";
import {
  assertValidFinanceYearDisplayName,
  normalizeFinanceYearDisplayName,
} from "@/lib/finance/setup/finance-year-display-name";
import {
  createFinanceYear,
  updateFinanceYear,
} from "@/lib/finance/services/finance-year-service";
import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { resolveApprovedBudgetMeasure } from "@/lib/finance/reporting/approved-budget-measure-provider";
import { assertValidFinanceYearRange } from "@/lib/finance/setup/finance-setup-state";

const tenantA = "tenant-a";

function adminCtx(tenantId: string): FinanceAuthContext {
  return {
    tenantId,
    userId: "user-1",
    permissionKeys: new Set(["finance.admin", "finance.view"]),
  };
}

type Store = {
  years: FinanceYear[];
  configs: { tenantId: string; baseCurrency: string | null; setupStatus: string; currentFinanceYearId: string | null }[];
  budgets: { id: string; tenantId: string; financeYearId: string; currentBaselineVersionId: string | null }[];
  versions: {
    id: string;
    budgetId: string;
    status: "DRAFT" | "APPROVED";
    versionNumber: number;
  }[];
};

let store: Store;

function yearRow(partial: Partial<FinanceYear> & Pick<FinanceYear, "id">): FinanceYear {
  return {
    id: partial.id,
    tenantId: partial.tenantId ?? tenantA,
    name: partial.name ?? "FY 2026",
    startDate: partial.startDate ?? new Date("2026-01-01"),
    endDate: partial.endDate ?? new Date("2026-12-31"),
    status: partial.status ?? "DRAFT",
    seasonId: partial.seasonId ?? null,
    archivedAt: partial.archivedAt ?? null,
    createdAt: partial.createdAt ?? new Date(),
    updatedAt: partial.updatedAt ?? new Date(),
  };
}

const db = {
  financeYear: {
    findMany: vi.fn(async ({ where }: { where: { tenantId: string; id?: { not: string } } }) =>
      store.years.filter(
        (y) =>
          y.tenantId === where.tenantId && (where.id?.not ? y.id !== where.id.not : true),
      ),
    ),
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
      store.years.find((y) => y.id === where.id) ?? null,
    ),
    create: vi.fn(async ({ data }: { data: Omit<FinanceYear, "id" | "createdAt" | "updatedAt"> }) => {
      const row = yearRow({
        id: `year-${store.years.length + 1}`,
        ...data,
      });
      store.years.push(row);
      return row;
    }),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<Pick<FinanceYear, "name" | "startDate" | "endDate">>;
      }) => {
        const idx = store.years.findIndex((y) => y.id === where.id);
        if (idx < 0) throw new Error("missing");
        store.years[idx] = { ...store.years[idx]!, ...data, updatedAt: new Date() };
        return store.years[idx]!;
      },
    ),
    count: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
      store.years.filter((y) => y.tenantId === where.tenantId).length,
    ),
  },
  financeConfiguration: {
    findUnique: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
      store.configs.find((c) => c.tenantId === where.tenantId) ?? null,
    ),
    update: vi.fn(async ({ where, data }: { where: { tenantId: string }; data: Record<string, unknown> }) => {
      const idx = store.configs.findIndex((c) => c.tenantId === where.tenantId);
      if (idx >= 0) {
        store.configs[idx] = { ...store.configs[idx]!, ...data } as Store["configs"][0];
      }
      return store.configs[idx];
    }),
  },
  season: { findUnique: vi.fn(async () => null) },
  financeBudget: {
    findUnique: vi.fn(
      async ({
        where,
      }: {
        where: { tenantId_financeYearId: { tenantId: string; financeYearId: string } };
      }) =>
        store.budgets.find(
          (b) =>
            b.tenantId === where.tenantId_financeYearId.tenantId &&
            b.financeYearId === where.tenantId_financeYearId.financeYearId,
        ) ?? null,
    ),
  },
  financeBudgetVersion: {
    count: vi.fn(async ({ where }: { where: { budgetId: string; status: string } }) =>
      store.versions.filter(
        (v) => v.budgetId === where.budgetId && v.status === where.status,
      ).length,
    ),
  },
};

vi.mock("@/lib/finance/services/finance-configuration-service", () => ({
  ensureFinanceConfigurationRow: vi.fn(async (_db: unknown, tenantId: string) => {
    let row = store.configs.find((c) => c.tenantId === tenantId);
    if (!row) {
      row = {
        tenantId,
        baseCurrency: "CHF",
        setupStatus: "IN_PROGRESS",
        currentFinanceYearId: null,
      };
      store.configs.push(row);
    }
    return row;
  }),
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: vi.fn(async () => undefined),
}));

beforeEach(() => {
  store = {
    years: [],
    configs: [
      {
        tenantId: tenantA,
        baseCurrency: "CHF",
        setupStatus: "IN_PROGRESS",
        currentFinanceYearId: null,
      },
    ],
    budgets: [],
    versions: [],
  };
  vi.clearAllMocks();
});

describe("finance year display name (FIN-02B R2)", () => {
  it("rejects blank and whitespace-only names", () => {
    expect(() => assertValidFinanceYearDisplayName("   ")).toThrow(FinanceDomainError);
    expect(normalizeFinanceYearDisplayName("  FY 2026  ")).toBe("FY 2026");
  });

  it("stores and returns tenant-defined names without inference", async () => {
    const created = await createFinanceYear(db, adminCtx(tenantA), {
      name: "2026/27",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2027-06-30"),
    });
    expect(created.name).toBe("2026/27");
    expect(created.startDate.toISOString()).toContain("2026-07-01");
  });

  it("supports split-year periods without inferring the display name", () => {
    assertValidFinanceYearRange(new Date("2026-07-01"), new Date("2027-06-30"));
  });

  it("rejects invalid date ranges", async () => {
    await expect(
      createFinanceYear(db, adminCtx(tenantA), {
        name: "FY 2026",
        startDate: new Date("2026-12-31"),
        endDate: new Date("2026-01-01"),
      }),
    ).rejects.toMatchObject({ code: "FINANCE_INVALID_YEAR" });
  });

  it("rename preserves stable FinanceYear id and reporting resolution", async () => {
    store.years.push(
      yearRow({ id: "year-1", name: "FY 2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") }),
    );
    store.budgets.push({
      id: "budget-1",
      tenantId: tenantA,
      financeYearId: "year-1",
      currentBaselineVersionId: "v1",
    });
    store.versions.push(
      { id: "v1", budgetId: "budget-1", status: "APPROVED", versionNumber: 1 },
      { id: "v2", budgetId: "budget-1", status: "APPROVED", versionNumber: 2 },
    );

    const updated = await updateFinanceYear(db, adminCtx(tenantA), "year-1", {
      name: "Geschäftsjahr 2026",
    });
    expect(updated.id).toBe("year-1");
    expect(updated.name).toBe("Geschäftsjahr 2026");

    const measure = resolveApprovedBudgetMeasure({
      currentBaselineVersionId: "v1",
      versions: store.versions.map((v) => ({
        id: v.id,
        status: v.status,
        approvedAt: new Date(),
        lines: [],
      })),
    });
    expect(measure?.budgetVersionId).toBe("v1");
  });

  it("blocks period redefinition after approved budget history", async () => {
    store.years.push(
      yearRow({ id: "year-1", name: "FY 2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") }),
    );
    store.budgets.push({
      id: "budget-1",
      tenantId: tenantA,
      financeYearId: "year-1",
      currentBaselineVersionId: "v2",
    });
    store.versions.push({ id: "v1", budgetId: "budget-1", status: "APPROVED", versionNumber: 1 });

    await expect(
      updateFinanceYear(db, adminCtx(tenantA), "year-1", {
        startDate: new Date("2026-07-01"),
        endDate: new Date("2027-06-30"),
      }),
    ).rejects.toMatchObject({ code: "FINANCE_BUDGET_IMMUTABLE" });
  });
});
