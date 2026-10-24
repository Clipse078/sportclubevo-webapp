import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { buildProjectionAdoptionPreview } from "@/lib/finance/projection/projection-adoption-policy";
import { formatFinanceAutomaticForecastMoneyMinor } from "@/lib/finance/projection/projection-amount-presentation";
import { loadForecastWorkspaceSnapshot } from "@/lib/finance/services/finance-forecast-query-service";
import {
  adoptProjectionForYear,
} from "@/lib/finance/services/finance-projection-adoption-service";
import { resolveCanonicalCurrentForecastVersionByPointer } from "@/lib/finance/services/finance-forecast-service";

vi.mock("@/lib/finance/services/finance-projection-staleness-resolver", () => ({
  resolveProjectionVersionStaleness: vi.fn(async () => "FRESH" as const),
}));

const { resolveProjectionVersionStaleness } = await import(
  "@/lib/finance/services/finance-projection-staleness-resolver"
);

const tenantA = "tenant-a";
const yearId = "fy-2026";
const accountIncome = "acc-income";
const accountExpense = "acc-expense";
const accountSparse = "acc-sparse";

function ctx(overrides?: Partial<FinanceAuthContext>): FinanceAuthContext {
  return {
    tenantId: tenantA,
    userId: "user-1",
    permissionKeys: new Set(["finance.forecast.view", "finance.forecast.manage"]),
    ...overrides,
  };
}

describe("FIN-04B-06 projection adoption policy", () => {
  const accounts = [
    { accountId: accountIncome, semantic: "INCOME" as const, lifecycle: "ACTIVE" as const },
    { accountId: accountExpense, semantic: "EXPENSE" as const, lifecycle: "ACTIVE" as const },
    { accountId: accountSparse, semantic: "INCOME" as const, lifecycle: "ACTIVE" as const },
  ];

  it("replaces projected accounts and preserves null-projection forecast values", () => {
    const preview = buildProjectionAdoptionPreview({
      projectionVersionId: "pv-1",
      sourceForecastVersionId: "fv-1",
      accounts,
      projectedAmountByAccountId: new Map([
        [accountIncome, 236_327_04],
        [accountExpense, 75_000_00],
        [accountSparse, null],
      ]),
      currentForecastAmountByAccountId: new Map([
        [accountIncome, 200_000_00],
        [accountExpense, 80_000_00],
        [accountSparse, 25_000_00],
      ]),
    });

    expect(preview.eligibleAccountCount).toBe(2);
    expect(preview.unchangedAccountCount).toBe(1);
    const sparse = preview.lines.find((row) => row.accountId === accountSparse)!;
    expect(sparse.proposedAmountMinor).toBe(25_000_00);
    expect(sparse.adoptedFromProjection).toBe(false);
    expect(preview.persistableLines.find((l) => l.financialAccountId === accountSparse)?.amountMinor).toBe(
      25_000_00,
    );
    expect(preview.persistableLines.find((l) => l.financialAccountId === accountIncome)?.amountMinor).toBe(
      236_327_04,
    );
  });

  it("does not convert missing projection to zero", () => {
    const preview = buildProjectionAdoptionPreview({
      projectionVersionId: "pv-1",
      sourceForecastVersionId: "fv-1",
      accounts: [accounts[2]!],
      projectedAmountByAccountId: new Map([[accountSparse, null]]),
      currentForecastAmountByAccountId: new Map([[accountSparse, null]]),
    });
    expect(preview.eligibleAccountCount).toBe(0);
    expect(preview.persistableLines).toHaveLength(0);
  });

  it("keeps internal minor precision independent of whole-unit presentation", () => {
    const exactMinor = 236_327_04;
    const preview = buildProjectionAdoptionPreview({
      projectionVersionId: "pv-1",
      sourceForecastVersionId: "fv-1",
      accounts: [accounts[0]!],
      projectedAmountByAccountId: new Map([[accountIncome, exactMinor]]),
      currentForecastAmountByAccountId: new Map([[accountIncome, 1_00]]),
    });
    expect(preview.persistableLines[0]!.amountMinor).toBe(exactMinor);
    const roundedDisplay = formatFinanceAutomaticForecastMoneyMinor(exactMinor, "CHF", "de-CH");
    expect(roundedDisplay).toContain("236");
    expect(preview.persistableLines[0]!.amountMinor).not.toBe(236_327_00);
  });
});

type AdoptionStore = {
  financeYear: Array<{ id: string; tenantId: string; name: string }>;
  financialAccount: Array<{
    id: string;
    tenantId: string;
    name: string;
    sortOrder: number;
    canonicalSemantic: string;
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
  financeProjection: Array<{
    id: string;
    tenantId: string;
    financeYearId: string;
    currentProjectionVersionId: string | null;
  }>;
  financeProjectionVersion: Array<{
    id: string;
    financeProjectionId: string;
    status: "CURRENT" | "SUPERSEDED";
    versionNumber: number;
    actualsThroughDate: Date;
    evidenceFingerprint: string | null;
    generatedAt: Date;
  }>;
  financeProjectionLine: Array<{
    projectionVersionId: string;
    financialAccountId: string;
    projectedAmountMinor: number | null;
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
  financeProjectionAdoption: Array<Record<string, unknown>>;
};

function makeAdoptionDb(store: AdoptionStore) {
  let forecastLineSeq = 0;
  let adoptionSeq = 0;
  let forecastVersionSeq = 0;

  const db = {
    financeYear: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeYear.find((y) => y.id === where.id) ?? null,
    },
    financialAccount: {
      findMany: async ({ where }: { where: { tenantId: string } }) =>
        store.financialAccount.filter((a) => a.tenantId === where.tenantId),
    },
    financeProjection: {
      findUnique: async ({
        where,
        include,
      }: {
        where:
          | { tenantId_financeYearId: { tenantId: string; financeYearId: string } }
          | { id: string };
        include?: { currentProjectionVersion?: { include?: { lines?: boolean } } };
      }) => {
        const projection =
          "tenantId_financeYearId" in where
            ? store.financeProjection.find(
                (p) =>
                  p.tenantId === where.tenantId_financeYearId.tenantId &&
                  p.financeYearId === where.tenantId_financeYearId.financeYearId,
              )
            : store.financeProjection.find((p) => p.id === where.id);
        if (!projection) return null;
        const currentProjectionVersion = projection.currentProjectionVersionId
          ? store.financeProjectionVersion.find((v) => v.id === projection.currentProjectionVersionId)
          : null;
        return {
          ...projection,
          currentProjectionVersion: include?.currentProjectionVersion
            ? {
                ...currentProjectionVersion,
                lines: store.financeProjectionLine.filter(
                  (l) => l.projectionVersionId === currentProjectionVersion?.id,
                ),
              }
            : currentProjectionVersion,
        };
      },
    },
    financeProjectionVersion: {
      findUnique: async () => null,
    },
    financeProjectionLine: {},
    financeForecast: {
      findUnique: async ({
        where,
        include,
      }: {
        where:
          | { tenantId_financeYearId: { tenantId: string; financeYearId: string } }
          | { id: string };
        include?: {
          currentVersion?: { include?: { lines?: boolean } };
          versions?: { orderBy?: { versionNumber: "desc" } };
        };
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
        const versions = store.financeForecastVersion
          .filter((v) => v.forecastId === forecast.id)
          .sort((a, b) => b.versionNumber - a.versionNumber);
        const currentVersion = forecast.currentVersionId
          ? store.financeForecastVersion.find((v) => v.id === forecast.currentVersionId)
          : null;
        return {
          ...forecast,
          versions: include?.versions ? versions : undefined,
          currentVersion: include?.currentVersion
            ? {
                ...currentVersion,
                lines: store.financeForecastLine.filter(
                  (l) => l.forecastVersionId === currentVersion?.id,
                ),
              }
            : currentVersion,
        };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { currentVersionId?: string };
      }) => {
        const row = store.financeForecast.find((f) => f.id === where.id)!;
        if (data.currentVersionId !== undefined) {
          row.currentVersionId = data.currentVersionId;
        }
        return row;
      },
    },
    financeForecastVersion: {
      findUnique: async ({
        where,
        include,
      }: {
        where: { id: string };
        include?: {
          lines?: boolean;
          forecast?: { select?: { id?: boolean; tenantId?: boolean } };
        };
      }) => {
        const row = store.financeForecastVersion.find((v) => v.id === where.id) ?? null;
        if (!row) return null;
        const forecast = store.financeForecast.find((f) => f.id === row.forecastId)!;
        return {
          ...row,
          lines: include?.lines
            ? store.financeForecastLine.filter((l) => l.forecastVersionId === row.id)
            : undefined,
          forecast: include?.forecast
            ? { id: forecast.id, tenantId: forecast.tenantId }
            : undefined,
        };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { status?: "SUPERSEDED" | "CURRENT" };
      }) => {
        const row = store.financeForecastVersion.find((v) => v.id === where.id)!;
        if (data.status) row.status = data.status;
        return row;
      },
      create: async ({
        data,
      }: {
        data: {
          forecastId: string;
          status: "CURRENT";
          versionNumber: number;
          createdByUserId: string;
          lines?: { create: Array<{ financialAccountId: string; amountMinor: number }> };
        };
      }) => {
        forecastVersionSeq += 1;
        const id = `fv-new-${forecastVersionSeq}`;
        store.financeForecastVersion.push({
          id,
          forecastId: data.forecastId,
          status: data.status,
          versionNumber: data.versionNumber,
        });
        for (const line of data.lines?.create ?? []) {
          forecastLineSeq += 1;
          store.financeForecastLine.push({
            id: `fl-${forecastLineSeq}`,
            forecastVersionId: id,
            financialAccountId: line.financialAccountId,
            amountMinor: line.amountMinor,
          });
        }
        return { id, ...data };
      },
    },
    financeForecastLine: {},
    financeProjectionAdoption: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        adoptionSeq += 1;
        const row = { id: `adopt-${adoptionSeq}`, ...data };
        store.financeProjectionAdoption.push(row);
        return row;
      },
    },
    financeActualEntry: {},
    financeBudget: {},
    financeBudgetVersion: {},
    financeBudgetLine: {},
    financeConfiguration: {},
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
  };
  return db;
}

function seedAdoptionStore(): AdoptionStore {
  return {
    financeYear: [{ id: yearId, tenantId: tenantA, name: "FY 2026" }],
    financialAccount: [
      {
        id: accountIncome,
        tenantId: tenantA,
        name: "Income",
        sortOrder: 1,
        canonicalSemantic: "INCOME",
        lifecycle: "ACTIVE",
      },
      {
        id: accountExpense,
        tenantId: tenantA,
        name: "Expense",
        sortOrder: 2,
        canonicalSemantic: "EXPENSE",
        lifecycle: "ACTIVE",
      },
      {
        id: accountSparse,
        tenantId: tenantA,
        name: "Sparse",
        sortOrder: 3,
        canonicalSemantic: "INCOME",
        lifecycle: "ACTIVE",
      },
    ],
    financeProjection: [
      {
        id: "proj-1",
        tenantId: tenantA,
        financeYearId: yearId,
        currentProjectionVersionId: "pv-1",
      },
    ],
    financeProjectionVersion: [
      {
        id: "pv-1",
        financeProjectionId: "proj-1",
        status: "CURRENT",
        versionNumber: 1,
        actualsThroughDate: new Date("2026-06-30T00:00:00.000Z"),
        evidenceFingerprint: "fp",
        generatedAt: new Date(),
      },
    ],
    financeProjectionLine: [
      { projectionVersionId: "pv-1", financialAccountId: accountIncome, projectedAmountMinor: 300_000_00 },
      { projectionVersionId: "pv-1", financialAccountId: accountExpense, projectedAmountMinor: 70_000_00 },
      { projectionVersionId: "pv-1", financialAccountId: accountSparse, projectedAmountMinor: null },
    ],
    financeForecast: [
      { id: "fc-1", tenantId: tenantA, financeYearId: yearId, currentVersionId: "fv-1" },
    ],
    financeForecastVersion: [{ id: "fv-1", forecastId: "fc-1", status: "CURRENT", versionNumber: 1 }],
    financeForecastLine: [
      { id: "fl-1", forecastVersionId: "fv-1", financialAccountId: accountIncome, amountMinor: 200_000_00 },
      { id: "fl-2", forecastVersionId: "fv-1", financialAccountId: accountExpense, amountMinor: 80_000_00 },
      { id: "fl-3", forecastVersionId: "fv-1", financialAccountId: accountSparse, amountMinor: 25_000_00 },
    ],
    financeProjectionAdoption: [],
  };
}

describe("FIN-04B-06 adoptProjectionForYear service", () => {
  beforeEach(() => {
    vi.mocked(resolveProjectionVersionStaleness).mockResolvedValue("FRESH");
  });

  it("FIN-04B-06R1 resolves version 2 from currentVersionId after adoption (workspace reload)", async () => {
    const store = seedAdoptionStore();
    const db = makeAdoptionDb(store);
    await adoptProjectionForYear(db, ctx(), {
      financeYearId: yearId,
      expectedSourceForecastVersionId: "fv-1",
      expectedProjectionVersionId: "pv-1",
    });
    const forecast = store.financeForecast[0]!;
    const canonical = await resolveCanonicalCurrentForecastVersionByPointer(db, ctx(), forecast);
    expect(canonical?.versionNumber).toBe(2);
    expect(canonical?.status).toBe("CURRENT");
    const v1 = store.financeForecastVersion.find((v) => v.id === "fv-1")!;
    expect(v1.status).toBe("SUPERSEDED");
    expect(forecast.currentVersionId).toBe(canonical?.id);
    const adoption = store.financeProjectionAdoption[0]!;
    expect(adoption.sourceForecastVersionId).toBe("fv-1");
    expect(adoption.targetForecastVersionId).toBe(canonical?.id);
  });

  it("creates new CURRENT forecast version, supersedes prior, and records provenance", async () => {
    const store = seedAdoptionStore();
    const db = makeAdoptionDb(store);
    const result = await adoptProjectionForYear(db, ctx(), {
      financeYearId: yearId,
      expectedSourceForecastVersionId: "fv-1",
      expectedProjectionVersionId: "pv-1",
    });
    expect(result.targetVersionNumber).toBe(2);
    const old = store.financeForecastVersion.find((v) => v.id === "fv-1")!;
    expect(old.status).toBe("SUPERSEDED");
    const currentVersions = store.financeForecastVersion.filter((v) => v.status === "CURRENT");
    expect(currentVersions).toHaveLength(1);
    expect(store.financeForecast[0]!.currentVersionId).toBe(result.targetForecastVersionId);
    const sparseLine = store.financeForecastLine.find(
      (l) => l.forecastVersionId === result.targetForecastVersionId && l.financialAccountId === accountSparse,
    );
    expect(sparseLine?.amountMinor).toBe(25_000_00);
    const incomeLine = store.financeForecastLine.find(
      (l) => l.forecastVersionId === result.targetForecastVersionId && l.financialAccountId === accountIncome,
    );
    expect(incomeLine?.amountMinor).toBe(300_000_00);
    expect(store.financeProjectionAdoption[0]).toMatchObject({
      projectionVersionId: "pv-1",
      sourceForecastVersionId: "fv-1",
      targetForecastVersionId: result.targetForecastVersionId,
      applyScope: "WHOLE_FINANCE_YEAR",
      appliedByUserId: "user-1",
    });
  });

  it("blocks stale projection adoption", async () => {
    vi.mocked(resolveProjectionVersionStaleness).mockResolvedValue("STALE");
    const db = makeAdoptionDb(seedAdoptionStore());
    await expect(
      adoptProjectionForYear(db, ctx(), {
        financeYearId: yearId,
        expectedSourceForecastVersionId: "fv-1",
        expectedProjectionVersionId: "pv-1",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_ADOPTION_PROJECTION_STALE" });
  });

  it("blocks when forecast version changed concurrently", async () => {
    const db = makeAdoptionDb(seedAdoptionStore());
    await expect(
      adoptProjectionForYear(db, ctx(), {
        financeYearId: yearId,
        expectedSourceForecastVersionId: "fv-wrong",
        expectedProjectionVersionId: "pv-1",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_ADOPTION_FORECAST_CHANGED" });
  });

  it("blocks when projection version changed concurrently", async () => {
    const db = makeAdoptionDb(seedAdoptionStore());
    await expect(
      adoptProjectionForYear(db, ctx(), {
        financeYearId: yearId,
        expectedSourceForecastVersionId: "fv-1",
        expectedProjectionVersionId: "pv-wrong",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_ADOPTION_PROJECTION_CHANGED" });
  });

  it("blocks zero eligible projection lines", async () => {
    const store = seedAdoptionStore();
    store.financeProjectionLine = store.financeProjectionLine.map((line) => ({
      ...line,
      projectedAmountMinor: null,
    }));
    const db = makeAdoptionDb(store);
    await expect(
      adoptProjectionForYear(db, ctx(), {
        financeYearId: yearId,
        expectedSourceForecastVersionId: "fv-1",
        expectedProjectionVersionId: "pv-1",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_ADOPTION_NO_ELIGIBLE_LINES" });
  });

  it("requires manage permission", async () => {
    const db = makeAdoptionDb(seedAdoptionStore());
    await expect(
      adoptProjectionForYear(db, ctx({ permissionKeys: new Set(["finance.forecast.view"]) }), {
        financeYearId: yearId,
        expectedSourceForecastVersionId: "fv-1",
        expectedProjectionVersionId: "pv-1",
      }),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });
});

describe("FIN-04B-06R1 forecast workspace version resolution", () => {
  it("loadForecastWorkspaceSnapshot exposes versionNumber 2 after adoption", async () => {
    const store = seedAdoptionStore();
    const db = {
      ...makeAdoptionDb(store),
      financeConfiguration: {
        findUnique: async () => ({
          currentFinanceYearId: yearId,
          baseCurrency: "CHF",
        }),
      },
      financeYear: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          store.financeYear.find((y) => y.id === where.id) ?? null,
        findMany: async ({ where }: { where: { tenantId: string } }) =>
          store.financeYear.filter((y) => y.tenantId === where.tenantId),
      },
      financialAccount: {
        findMany: async ({ where }: { where: { tenantId: string } }) =>
          store.financialAccount
            .filter((a) => a.tenantId === where.tenantId)
            .map((a) => ({ ...a, reportingGroup: { name: "Group" } })),
      },
      financeBudget: {
        findUnique: async () => null,
      },
    };
    await adoptProjectionForYear(db, ctx(), {
      financeYearId: yearId,
      expectedSourceForecastVersionId: "fv-1",
      expectedProjectionVersionId: "pv-1",
    });
    const workspace = await loadForecastWorkspaceSnapshot(
      db,
      ctx({ permissionKeys: new Set(["finance.forecast.view", "finance.budget.view"]) }),
      yearId,
    );
    expect(workspace.snapshot?.versionNumber).toBe(2);
    expect(workspace.snapshot?.versionId).toBe(store.financeForecast[0]!.currentVersionId);
  });
});

describe("FIN-04B-06 dashboard regression guards", () => {
  it("remounts forecast workspace when canonical forecast version id changes", () => {
    const source = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/finance/forecast/page.tsx"),
      "utf8",
    );
    expect(source).toContain("key={snapshot?.versionId");
  });

  it("keeps explainability and adoption CTA wiring in projection section", () => {
    const source = readFileSync(
      join(process.cwd(), "components/admin/finance/FinanceProjectionWorkspaceSection.tsx"),
      "utf8",
    );
    expect(source).toContain("explainActionShort");
    expect(source).toContain("formatFinanceAutomaticForecastMoneyMinor");
    expect(source).toContain('data-finance-projection-action="adopt"');
    expect(source).not.toContain("type=\"checkbox\"");
  });
});
