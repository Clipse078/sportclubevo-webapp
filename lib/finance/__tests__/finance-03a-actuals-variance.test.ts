import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { computeAccountVarianceMetrics } from "@/lib/finance/actual/variance-semantics";
import { buildActualVarianceReadModel } from "@/lib/finance/actual/actual-variance-read-model";
import {
  aggregateActualTotalsByAccount,
  summarizeActualFinancialResult,
} from "@/lib/finance/actual/aggregate-actuals";
import {
  assertEffectiveDateWithinFinanceYear,
  isEffectiveDateWithinFinanceYear,
} from "@/lib/finance/actual/finance-year-membership";
import {
  isEffectiveDateOnOrBeforeCutoff,
  resolveYtdCutoffDate,
  YTD_BUDGET_VARIANCE_SUPPORTED,
} from "@/lib/finance/actual/period-semantics";
import { resolveApprovedBudgetMeasure } from "@/lib/finance/reporting/approved-budget-measure-provider";
import { resolveCurrentGovernanceBaselineVersion } from "@/lib/finance/budget/current-governance-baseline";
import {
  createFinanceActualEntry,
  deleteFinanceActualEntry,
  updateFinanceActualEntry,
} from "@/lib/finance/services/finance-actual-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { FINANCE_PERMISSION_DEFS } from "@/lib/permissions/finance-permission-reconciliation";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

function ctx(tenantId = tenantA, permissions = ["finance.actual.view", "finance.actual.manage"]) {
  return {
    tenantId,
    userId: "user-1",
    permissionKeys: new Set(permissions),
  } satisfies FinanceAuthContext;
}

type Store = {
  financeYear: Array<{
    id: string;
    tenantId: string;
    name: string;
    startDate: Date;
    endDate: Date;
  }>;
  financeConfiguration: Array<{ tenantId: string; baseCurrency: string | null }>;
  financialAccount: Array<{
    id: string;
    tenantId: string;
    name: string;
    canonicalSemantic: "INCOME" | "EXPENSE";
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
  financeActualEntry: Array<{
    id: string;
    tenantId: string;
    financeYearId: string;
    financialAccountId: string;
    effectiveDate: Date;
    amountMinor: number;
    currency: string;
    description: string | null;
    source: "MANUAL";
    createdByUserId: string | null;
    updatedByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  financeBudget: Array<{
    id: string;
    tenantId: string;
    financeYearId: string;
    currentBaselineVersionId: string | null;
  }>;
  financeBudgetVersion: Array<{
    id: string;
    budgetId: string;
    status: "DRAFT" | "APPROVED";
    baseCurrency: string | null;
    approvedAt: Date | null;
    lines: Array<{ financialAccountId: string; amountMinor: number }>;
  }>;
};

function makeDb(store: Store) {
  let seq = 0;
  return {
    financeYear: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeYear.find((y) => y.id === where.id) ?? null,
      findMany: async () => store.financeYear,
    },
    financeConfiguration: {
      findUnique: async ({ where }: { where: { tenantId: string } }) =>
        store.financeConfiguration.find((c) => c.tenantId === where.tenantId) ?? null,
    },
    financialAccount: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financialAccount.find((a) => a.id === where.id) ?? null,
      findMany: async () => store.financialAccount,
    },
    financeActualEntry: {
      create: async ({ data }: { data: Omit<(typeof store.financeActualEntry)[number], "id" | "createdAt" | "updatedAt"> }) => {
        const row = {
          ...data,
          id: `actual-${++seq}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.financeActualEntry.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeActualEntry.find((e) => e.id === where.id) ?? null,
      findMany: async ({ where }: { where: { tenantId: string; financeYearId: string } }) =>
        store.financeActualEntry.filter(
          (e) => e.tenantId === where.tenantId && e.financeYearId === where.financeYearId,
        ),
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<(typeof store.financeActualEntry)[number]>;
      }) => {
        const row = store.financeActualEntry.find((e) => e.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const idx = store.financeActualEntry.findIndex((e) => e.id === where.id);
        store.financeActualEntry.splice(idx, 1);
      },
      count: async ({ where }: { where: { financialAccountId: string; tenantId: string } }) =>
        store.financeActualEntry.filter(
          (e) =>
            e.financialAccountId === where.financialAccountId && e.tenantId === where.tenantId,
        ).length,
    },
    financeBudget: {
      findUnique: async ({
        where,
      }: {
        where: { tenantId_financeYearId: { tenantId: string; financeYearId: string } };
      }) => {
        const budget = store.financeBudget.find(
          (b) =>
            b.tenantId === where.tenantId_financeYearId.tenantId &&
            b.financeYearId === where.tenantId_financeYearId.financeYearId,
        );
        if (!budget) return null;
        const versions = store.financeBudgetVersion
          .filter((v) => v.budgetId === budget.id)
          .map((v) => ({ ...v, lines: v.lines }));
        return { ...budget, versions };
      },
    },
    financeBudgetVersion: { findUnique: async () => null },
    financeBudgetLine: { count: async () => 0 },
    financialReportingGroup: { findMany: async () => [] },
  };
}

describe("FIN-03A variance semantics", () => {
  it("income favorable when actual exceeds budget", () => {
    const m = computeAccountVarianceMetrics({
      canonicalSemantic: "INCOME",
      approvedBudgetMinor: 100_000_00,
      actualMinor: 110_000_00,
    });
    expect(m.rawDeltaMinor).toBe(10_000_00);
    expect(m.favorabilityMinor).toBe(10_000_00);
    expect(m.favorability).toBe("FAVORABLE");
  });

  it("expense unfavorable when actual exceeds budget", () => {
    const m = computeAccountVarianceMetrics({
      canonicalSemantic: "EXPENSE",
      approvedBudgetMinor: 100_000_00,
      actualMinor: 110_000_00,
    });
    expect(m.rawDeltaMinor).toBe(10_000_00);
    expect(m.favorabilityMinor).toBe(-10_000_00);
    expect(m.favorability).toBe("UNFAVORABLE");
  });

  it("distinguishes no actual from zero actual", () => {
    const noActual = computeAccountVarianceMetrics({
      canonicalSemantic: "INCOME",
      approvedBudgetMinor: 100_00,
      actualMinor: null,
    });
    expect(noActual.hasActual).toBe(false);

    const zeroActual = computeAccountVarianceMetrics({
      canonicalSemantic: "INCOME",
      approvedBudgetMinor: 100_00,
      actualMinor: 0,
    });
    expect(zeroActual.hasActual).toBe(true);
    expect(zeroActual.favorability).toBe("UNFAVORABLE");
  });

  it("does not treat missing baseline as zero budget", () => {
    const m = computeAccountVarianceMetrics({
      canonicalSemantic: "EXPENSE",
      approvedBudgetMinor: null,
      actualMinor: 50_00,
    });
    expect(m.hasApprovedBudget).toBe(false);
    expect(m.rawDeltaMinor).toBeNull();
  });
});

describe("FIN-03A period semantics", () => {
  const year = {
    startDate: new Date("2026-07-01T00:00:00.000Z"),
    endDate: new Date("2027-06-30T00:00:00.000Z"),
  };

  it("supports non-calendar finance years", () => {
    expect(
      isEffectiveDateWithinFinanceYear(new Date("2027-03-15T00:00:00.000Z"), year),
    ).toBe(true);
    expect(
      isEffectiveDateWithinFinanceYear(new Date("2026-06-30T00:00:00.000Z"), year),
    ).toBe(false);
  });

  it("rejects dates outside finance year", () => {
    expect(() =>
      assertEffectiveDateWithinFinanceYear(new Date("2028-01-01T00:00:00.000Z"), year),
    ).toThrow(FinanceDomainError);
  });

  it("resolves YTD cutoff inside year", () => {
    const cutoff = resolveYtdCutoffDate(year, new Date("2027-01-15T00:00:00.000Z"));
    expect(cutoff.toISOString()).toBe("2027-01-15T00:00:00.000Z");
    expect(YTD_BUDGET_VARIANCE_SUPPORTED).toBe(false);
  });

  it("filters entries through YTD cutoff", () => {
    const cutoff = new Date("2027-03-01T00:00:00.000Z");
    expect(isEffectiveDateOnOrBeforeCutoff(new Date("2027-02-01T00:00:00.000Z"), cutoff)).toBe(
      true,
    );
    expect(isEffectiveDateOnOrBeforeCutoff(new Date("2027-04-01T00:00:00.000Z"), cutoff)).toBe(
      false,
    );
  });
});

describe("FIN-03A actual service", () => {
  let store: Store;
  let db: ReturnType<typeof makeDb>;

  beforeEach(() => {
    store = {
      financeYear: [
        {
          id: "year-1",
          tenantId: tenantA,
          name: "FY 2027",
          startDate: new Date("2027-01-01T00:00:00.000Z"),
          endDate: new Date("2027-12-31T00:00:00.000Z"),
        },
      ],
      financeConfiguration: [{ tenantId: tenantA, baseCurrency: "CHF" }],
      financialAccount: [
        {
          id: "acc-income",
          tenantId: tenantA,
          name: "Membership",
          canonicalSemantic: "INCOME",
          lifecycle: "ACTIVE",
        },
        {
          id: "acc-archived",
          tenantId: tenantA,
          name: "Old",
          canonicalSemantic: "EXPENSE",
          lifecycle: "ARCHIVED",
        },
      ],
      financeActualEntry: [],
      financeBudget: [],
      financeBudgetVersion: [],
    };
    db = makeDb(store);
  });

  it("creates manual actual with positive magnitude", async () => {
    const row = await createFinanceActualEntry(db, ctx(), {
      financeYearId: "year-1",
      financialAccountId: "acc-income",
      effectiveDate: "2027-03-15",
      amountMinor: 25_000_00,
      currency: "CHF",
    });
    expect(row.amountMinor).toBe(25_000_00);
    expect(row.currency).toBe("CHF");
  });

  it("rejects cross-tenant year", async () => {
    await expect(
      createFinanceActualEntry(db, ctx(tenantB), {
        financeYearId: "year-1",
        financialAccountId: "acc-income",
        effectiveDate: "2027-03-15",
        amountMinor: 100,
        currency: "CHF",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });
  });

  it("rejects archived account for new entry", async () => {
    await expect(
      createFinanceActualEntry(db, ctx(), {
        financeYearId: "year-1",
        financialAccountId: "acc-archived",
        effectiveDate: "2027-03-15",
        amountMinor: 100,
        currency: "CHF",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_ARCHIVED" });
  });

  it("rejects negative amount and currency mismatch", async () => {
    await expect(
      createFinanceActualEntry(db, ctx(), {
        financeYearId: "year-1",
        financialAccountId: "acc-income",
        effectiveDate: "2027-03-15",
        amountMinor: -1,
        currency: "CHF",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_ACTUAL_INVALID_AMOUNT" });

    await expect(
      createFinanceActualEntry(db, ctx(), {
        financeYearId: "year-1",
        financialAccountId: "acc-income",
        effectiveDate: "2027-03-15",
        amountMinor: 100,
        currency: "EUR",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_INVALID_CURRENCY" });
  });

  it("supports edit and delete lifecycle", async () => {
    const created = await createFinanceActualEntry(db, ctx(), {
      financeYearId: "year-1",
      financialAccountId: "acc-income",
      effectiveDate: "2027-03-15",
      amountMinor: 100,
      currency: "CHF",
    });
    const updated = await updateFinanceActualEntry(db, ctx(), created.id, {
      amountMinor: 200,
    });
    expect(updated.amountMinor).toBe(200);
    await deleteFinanceActualEntry(db, ctx(), created.id);
    expect(store.financeActualEntry).toHaveLength(0);
  });
});

describe("FIN-03A re-baseline contract", () => {
  it("uses currentBaselineVersionId without rewriting actuals", () => {
    const versions = [
      {
        id: "v1",
        status: "APPROVED" as const,
        approvedAt: new Date(),
        baseCurrency: "CHF",
        lines: [{ financialAccountId: "acc-1", amountMinor: 100_00 }],
      },
      {
        id: "v2",
        status: "APPROVED" as const,
        approvedAt: new Date(),
        baseCurrency: "CHF",
        lines: [{ financialAccountId: "acc-1", amountMinor: 120_00 }],
      },
    ];
    const baselineV1 = resolveApprovedBudgetMeasure({
      currentBaselineVersionId: "v1",
      versions,
    });
    expect(baselineV1?.valuesByAccountId.get("acc-1")).toBe(100_00);

    const baselineV2 = resolveApprovedBudgetMeasure({
      currentBaselineVersionId: "v2",
      versions,
    });
    expect(baselineV2?.valuesByAccountId.get("acc-1")).toBe(120_00);

    const actualEntries = [
      {
        financialAccountId: "acc-1",
        canonicalSemantic: "INCOME" as const,
        amountMinor: 110_00,
      },
    ];
    const readV1 = buildActualVarianceReadModel({
      tenantId: tenantA,
      financeYearId: "year",
      financeYearName: "FY",
      baseCurrency: "CHF",
      comparisonMode: "FULL_YEAR",
      ytdCutoffDate: null,
      approvedMeasure: baselineV1,
      accounts: [
        {
          id: "acc-1",
          name: "Fees",
          canonicalSemantic: "INCOME",
          lifecycle: "ACTIVE",
        },
      ],
      actualEntries,
    });
    const readV2 = buildActualVarianceReadModel({
      tenantId: tenantA,
      financeYearId: "year",
      financeYearName: "FY",
      baseCurrency: "CHF",
      comparisonMode: "FULL_YEAR",
      ytdCutoffDate: null,
      approvedMeasure: baselineV2,
      accounts: readV1.accounts.map((a) => ({
        id: a.accountId,
        name: a.accountName,
        canonicalSemantic: a.canonicalSemantic,
        lifecycle: a.lifecycle,
      })),
      actualEntries,
    });

    expect(readV1.actualSummary.incomeMinor).toBe(readV2.actualSummary.incomeMinor);
    expect(readV1.accounts[0]!.metrics.rawDeltaMinor).toBe(10_00);
    expect(readV2.accounts[0]!.metrics.rawDeltaMinor).toBe(-10_00);
  });

  it("excludes DRAFT from governance baseline", () => {
    const baseline = resolveCurrentGovernanceBaselineVersion({
      currentBaselineVersionId: null,
      versions: [
        { id: "draft", status: "DRAFT" },
        { id: "approved", status: "APPROVED" },
      ],
    });
    expect(baseline?.id).toBe("approved");
  });
});

describe("FIN-03A aggregation", () => {
  it("aggregates income and expense totals and result", () => {
    const totals = aggregateActualTotalsByAccount([
      { financialAccountId: "i1", amountMinor: 100_00 },
      { financialAccountId: "e1", amountMinor: 40_00 },
    ]);
    expect(totals.get("i1")).toBe(100_00);

    const summary = summarizeActualFinancialResult([
      { financialAccountId: "i1", canonicalSemantic: "INCOME", amountMinor: 100_00 },
      { financialAccountId: "e1", canonicalSemantic: "EXPENSE", amountMinor: 40_00 },
    ]);
    expect(summary.resultMinor).toBe(60_00);
  });
});

describe("FIN-03A permissions registry", () => {
  it("registers finance.actual.view and finance.actual.manage", () => {
    const keys = FINANCE_PERMISSION_DEFS.map((d) => d.key);
    expect(keys).toContain(PERMISSIONS.FINANCE_ACTUAL_VIEW);
    expect(keys).toContain(PERMISSIONS.FINANCE_ACTUAL_MANAGE);
  });
});

describe("FIN-03A UX contract", () => {
  it("declares actuals workspace route without binary checkboxes", () => {
    const panel = readFileSync(
      join(process.cwd(), "components/admin/finance/FinanceActualsWorkspacePanel.tsx"),
      "utf8",
    );
    expect(panel).toContain("Finance.actuals");
    expect(panel).not.toContain('type="checkbox"');
    expect(panel).toContain("SceSegmentedControl");
  });
});
