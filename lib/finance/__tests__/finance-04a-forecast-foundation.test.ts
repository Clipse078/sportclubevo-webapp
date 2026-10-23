import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import { FORECAST_PHASING_SUPPORTED } from "@/lib/finance/forecast/forecast-contract";
import { computeForecastBudgetComparisonMetrics } from "@/lib/finance/forecast/forecast-budget-comparison";
import { resolveActualVersusAnnualForecastPresentation } from "@/lib/finance/forecast/actual-forecast-policy";
import { financeResultSemanticTextClass } from "@/lib/finance/presentation/finance-result-presentation";
import {
  createForecastForYear,
  upsertForecastLine,
} from "@/lib/finance/services/finance-forecast-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { FINANCE_PERMISSION_DEFS } from "@/lib/permissions/finance-permission-reconciliation";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { isFinanceCapabilityImplemented } from "@/lib/finance/capability-registry";
import { PROPOSED_FINANCE_PERMISSION_KEYS } from "@/lib/finance/finance-architecture";

const tenantA = "tenant-a";
const yearId = "fy-2026";

function forecastCtx(overrides?: Partial<FinanceAuthContext>): FinanceAuthContext {
  return {
    tenantId: tenantA,
    userId: "user-1",
    permissionKeys: new Set([
      "finance.forecast.view",
      "finance.forecast.manage",
    ]),
    ...overrides,
  };
}

type ForecastStore = {
  financeYear: Array<{ id: string; tenantId: string; name: string }>;
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
    versionNumber: number;
  }>;
  financeBudgetLine: Array<{
    id: string;
    budgetVersionId: string;
    financialAccountId: string;
    amountMinor: number;
  }>;
  financeForecast: Array<{
    id: string;
    tenantId: string;
    financeYearId: string;
    currentVersionId: string | null;
  }>;
  financeForecastVersion: Array<{
    id: string;
    forecastId: string;
    status: "CURRENT" | "SUPERSEDED";
    versionNumber: number;
  }>;
  financeForecastLine: Array<{
    id: string;
    forecastVersionId: string;
    financialAccountId: string;
    amountMinor: number;
  }>;
  financialAccount: Array<{
    id: string;
    tenantId: string;
    canonicalSemantic: string;
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
};

function makeForecastDb(store: ForecastStore) {
  let forecastSeq = 0;
  let versionSeq = 0;
  let lineSeq = 0;

  return {
    financeYear: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeYear.find((y) => y.id === where.id) ?? null,
    },
    financeBudget: {
      findUnique: async ({
        where,
        include,
      }: {
        where: { tenantId_financeYearId: { tenantId: string; financeYearId: string } };
        include?: { versions?: boolean };
      }) => {
        const budget =
          store.financeBudget.find(
            (b) =>
              b.tenantId === where.tenantId_financeYearId.tenantId &&
              b.financeYearId === where.tenantId_financeYearId.financeYearId,
          ) ?? null;
        if (!budget || !include?.versions) return budget;
        return {
          ...budget,
          versions: store.financeBudgetVersion.filter((v) => v.budgetId === budget.id),
        };
      },
    },
    financeBudgetVersion: {
      findUnique: async ({ where, include }: { where: { id: string }; include?: unknown }) => {
        const version = store.financeBudgetVersion.find((v) => v.id === where.id);
        if (!version || !include) return version ?? null;
        return {
          ...version,
          lines: store.financeBudgetLine
            .filter((l) => l.budgetVersionId === version.id)
            .map((line) => ({
              ...line,
              financialAccount: store.financialAccount.find((a) => a.id === line.financialAccountId)!,
            })),
        };
      },
    },
    financeBudgetLine: {},
    financeForecast: {
      findUnique: async ({
        where,
        include,
      }: {
        where:
          | { tenantId_financeYearId: { tenantId: string; financeYearId: string } }
          | { id: string };
        include?: { currentVersion?: { include?: { lines?: boolean } }; versions?: boolean };
      }) => {
        const forecast =
          "tenantId_financeYearId" in where
            ? store.financeForecast.find(
                (f) =>
                  f.tenantId === where.tenantId_financeYearId.tenantId &&
                  f.financeYearId === where.tenantId_financeYearId.financeYearId,
              )
            : store.financeForecast.find((f) => f.id === where.id);
        if (!forecast) return null;
        const currentVersion = forecast.currentVersionId
          ? store.financeForecastVersion.find((v) => v.id === forecast.currentVersionId)
          : null;
        return {
          ...forecast,
          currentVersion: include?.currentVersion
            ? {
                ...currentVersion,
                lines: store.financeForecastLine.filter(
                  (l) => l.forecastVersionId === currentVersion?.id,
                ),
              }
            : currentVersion,
          versions: include?.versions
            ? store.financeForecastVersion.filter((v) => v.forecastId === forecast.id)
            : undefined,
        };
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        forecastSeq += 1;
        const id = `forecast-${forecastSeq}`;
        store.financeForecast.push({
          id,
          tenantId: data.tenantId as string,
          financeYearId: data.financeYearId as string,
          currentVersionId: null,
        });
        return { id, ...data, currentVersionId: null };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { currentVersionId?: string };
      }) => {
        const row = store.financeForecast.find((f) => f.id === where.id)!;
        if (data.currentVersionId !== undefined) row.currentVersionId = data.currentVersionId;
        return row;
      },
    },
    financeForecastVersion: {
      findUnique: async ({ where, include }: { where: { id: string }; include?: unknown }) => {
        const version = store.financeForecastVersion.find((v) => v.id === where.id);
        if (!version || !include) return version ?? null;
        return {
          ...version,
          forecast: store.financeForecast.find((f) => f.id === version.forecastId)!,
        };
      },
      create: async ({ data }: { data: Record<string, unknown> & { lines?: { create: unknown[] } } }) => {
        versionSeq += 1;
        const id = `fversion-${versionSeq}`;
        store.financeForecastVersion.push({
          id,
          forecastId: data.forecastId as string,
          status: (data.status as "CURRENT") ?? "CURRENT",
          versionNumber: (data.versionNumber as number) ?? 1,
        });
        const linesCreate = data.lines as { create: Array<Record<string, unknown>> } | undefined;
        if (linesCreate?.create) {
          for (const line of linesCreate.create) {
            lineSeq += 1;
            store.financeForecastLine.push({
              id: `fline-${lineSeq}`,
              forecastVersionId: id,
              financialAccountId: line.financialAccountId as string,
              amountMinor: line.amountMinor as number,
            });
          }
        }
        return { id, ...data };
      },
    },
    financeForecastLine: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: {
          forecastVersionId_financialAccountId: {
            forecastVersionId: string;
            financialAccountId: string;
          };
        };
        create: Record<string, unknown>;
        update: { amountMinor: number };
      }) => {
        const existing = store.financeForecastLine.find(
          (l) =>
            l.forecastVersionId ===
              where.forecastVersionId_financialAccountId.forecastVersionId &&
            l.financialAccountId ===
              where.forecastVersionId_financialAccountId.financialAccountId,
        );
        if (existing) {
          existing.amountMinor = update.amountMinor;
          return existing;
        }
        lineSeq += 1;
        const row = {
          id: `fline-${lineSeq}`,
          forecastVersionId: create.forecastVersionId as string,
          financialAccountId: create.financialAccountId as string,
          amountMinor: create.amountMinor as number,
        };
        store.financeForecastLine.push(row);
        return row;
      },
    },
    financialAccount: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financialAccount.find((a) => a.id === where.id) ?? null,
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(makeForecastDb(store)),
  };
}

describe("SCE-FIN-04A forecast foundation", () => {
  it("documents no phasing contract", () => {
    expect(FORECAST_PHASING_SUPPORTED).toBe(false);
  });

  it("registers forecast permissions in reconciliation catalog", () => {
    expect(FINANCE_PERMISSION_DEFS.map((d) => d.key)).toContain("finance.forecast.view");
    expect(FINANCE_PERMISSION_DEFS.map((d) => d.key)).toContain("finance.forecast.manage");
    expect(PERMISSIONS.FINANCE_FORECAST_VIEW).toBe(
      PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_FORECAST_VIEW,
    );
  });

  it("implements FORECASTING capability in product registry", () => {
    expect(isFinanceCapabilityImplemented("FORECASTING")).toBe(true);
  });

  describe("forecast vs budget comparison", () => {
    it("income: higher forecast than budget is favorable", () => {
      const m = computeForecastBudgetComparisonMetrics({
        canonicalSemantic: "INCOME",
        approvedBudgetMinor: 100_00,
        forecastMinor: 120_00,
      });
      expect(m.rawForecastDeltaMinor).toBe(20_00);
      expect(m.favorability).toBe("FAVORABLE");
    });

    it("expense: higher forecast than budget is unfavorable", () => {
      const m = computeForecastBudgetComparisonMetrics({
        canonicalSemantic: "EXPENSE",
        approvedBudgetMinor: 100_00,
        forecastMinor: 120_00,
      });
      expect(m.rawForecastDeltaMinor).toBe(20_00);
      expect(m.favorability).toBe("UNFAVORABLE");
    });

    it("zero delta is on plan", () => {
      const m = computeForecastBudgetComparisonMetrics({
        canonicalSemantic: "INCOME",
        approvedBudgetMinor: 50_00,
        forecastMinor: 50_00,
      });
      expect(m.favorability).toBe("ON_PLAN");
    });

    it("missing baseline yields no fake variance", () => {
      const m = computeForecastBudgetComparisonMetrics({
        canonicalSemantic: "EXPENSE",
        approvedBudgetMinor: null,
        forecastMinor: 10_00,
      });
      expect(m.favorability).toBeNull();
      expect(m.rawForecastDeltaMinor).toBeNull();
    });
  });

  describe("actual vs annual forecast policy", () => {
    it("never exposes favorability between YTD actual and full-year forecast", () => {
      const p = resolveActualVersusAnnualForecastPresentation({
        actualYtdMinor: 40_00,
        annualForecastMinor: 100_00,
      });
      expect(p.mayShowVarianceLabels).toBe(false);
      expect(p.favorability).toBeNull();
      expect(p.rawDeltaMinor).toBeNull();
      expect(p.mayShowActualYtdReference).toBe(true);
    });
  });

  describe("result presentation", () => {
    it("uses canonical success/danger/neutral semantics", () => {
      expect(financeResultSemanticTextClass(1).length).toBeGreaterThan(0);
      expect(financeResultSemanticTextClass(-1).length).toBeGreaterThan(0);
      expect(financeResultSemanticTextClass(0)).toBe("");
    });
  });

  describe("persistence and lifecycle (in-memory)", () => {
    let store: ForecastStore;
    let db: ReturnType<typeof makeForecastDb>;

    beforeEach(() => {
      store = {
        financeYear: [{ id: yearId, tenantId: tenantA, name: "FY 2026/27" }],
        financeBudget: [
          {
            id: "budget-1",
            tenantId: tenantA,
            financeYearId: yearId,
            currentBaselineVersionId: "bversion-1",
          },
        ],
        financeBudgetVersion: [
          { id: "bversion-1", budgetId: "budget-1", status: "APPROVED", versionNumber: 1 },
        ],
        financeBudgetLine: [
          {
            id: "bline-1",
            budgetVersionId: "bversion-1",
            financialAccountId: "acc-income",
            amountMinor: 1000_00,
          },
        ],
        financeForecast: [],
        financeForecastVersion: [],
        financeForecastLine: [],
        financialAccount: [
          {
            id: "acc-income",
            tenantId: tenantA,
            canonicalSemantic: "INCOME",
            lifecycle: "ACTIVE",
          },
          {
            id: "acc-expense",
            tenantId: tenantA,
            canonicalSemantic: "EXPENSE",
            lifecycle: "ACTIVE",
          },
        ],
      };
      db = makeForecastDb(store);
    });

    it("creates empty forecast with stable version identity", async () => {
      const result = await createForecastForYear(db as never, forecastCtx(), {
        financeYearId: yearId,
        mode: "EMPTY",
      });
      expect(result.currentVersionId).toBeTruthy();
      expect(store.financeForecast[0]?.currentVersionId).toBe(result.currentVersionId);
    });

    it("copies baseline amounts on FROM_BASELINE initialization", async () => {
      const result = await createForecastForYear(db as never, forecastCtx(), {
        financeYearId: yearId,
        mode: "FROM_BASELINE",
      });
      expect(result.copiedLineCount).toBe(1);
      expect(store.financeForecastLine[0]?.amountMinor).toBe(1000_00);
    });

    it("copied forecast remains independent after budget line changes", async () => {
      await createForecastForYear(db as never, forecastCtx(), {
        financeYearId: yearId,
        mode: "FROM_BASELINE",
      });
      store.financeBudgetLine[0]!.amountMinor = 1_00;
      expect(store.financeForecastLine[0]?.amountMinor).toBe(1000_00);
    });

    it("rejects baseline initialization without approved baseline", async () => {
      store.financeBudget[0]!.currentBaselineVersionId = null;
      store.financeBudgetVersion[0]!.status = "DRAFT";
      await expect(
        createForecastForYear(db as never, forecastCtx(), {
          financeYearId: yearId,
          mode: "FROM_BASELINE",
        }),
      ).rejects.toMatchObject({ code: "FINANCE_FORECAST_NO_BASELINE" });
    });

    it("handles duplicate creation deterministically", async () => {
      await createForecastForYear(db as never, forecastCtx(), {
        financeYearId: yearId,
        mode: "EMPTY",
      });
      await expect(
        createForecastForYear(db as never, forecastCtx(), {
          financeYearId: yearId,
          mode: "EMPTY",
        }),
      ).rejects.toMatchObject({ code: "FINANCE_FORECAST_EXISTS" });
    });

    it("preserves version id on line save", async () => {
      const created = await createForecastForYear(db as never, forecastCtx(), {
        financeYearId: yearId,
        mode: "EMPTY",
      });
      await upsertForecastLine(db as never, forecastCtx(), {
        forecastVersionId: created.currentVersionId,
        financialAccountId: "acc-income",
        amountMinor: 500_00,
      });
      expect(store.financeForecast[0]?.currentVersionId).toBe(created.currentVersionId);
    });

    it("finance.admin can manage forecast", async () => {
      const adminCtx = forecastCtx({
        permissionKeys: new Set(["finance.admin", "finance.forecast.view"]),
      });
      await createForecastForYear(db as never, adminCtx, {
        financeYearId: yearId,
        mode: "EMPTY",
      });
      expect(store.financeForecast.length).toBe(1);
    });

    it("view-only cannot create forecast", async () => {
      const viewCtx = forecastCtx({ permissionKeys: new Set(["finance.forecast.view"]) });
      await expect(
        createForecastForYear(db as never, viewCtx, {
          financeYearId: yearId,
          mode: "EMPTY",
        }),
      ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
    });
  });

  it("provides Prisma migration for forecast models", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "prisma/migrations/20261023180000_sce_finance_04a_forecast_foundation/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("FinanceForecast");
    expect(sql).toContain("FinanceForecastVersion");
    expect(sql).toContain("FinanceForecastLine");
  });
});
