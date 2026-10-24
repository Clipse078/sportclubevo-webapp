import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  FORMAL_REFORECAST_REVISION_CONTEXT_MAX_LENGTH,
  FORECAST_REVISION_REASON_PRESENTATION,
} from "@/lib/finance/forecast/forecast-revision-reason";
import {
  validateFormalReforecastRevisionContext,
  parseFormalReforecastRevisionReasonInput,
} from "@/lib/finance/forecast/forecast-revision-metadata-validation";
import { mapForecastLinesForSnapshot } from "@/lib/finance/forecast/forecast-version-snapshot-transition";
import {
  ROLLING_FORECAST_CONCURRENCY_CONTRACT,
  ROLLING_FORECAST_FIN_04C_06_CLARITY_PRINCIPLES,
  ROLLING_FORECAST_FIN_04C_07_RELEASE_CLOSURE,
  ROLLING_FORECAST_PRODUCT_PRINCIPLE,
} from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import { persistFormalForecastRevision } from "@/lib/finance/services/finance-forecast-revision-service";
import {
  formalizeCurrentForecast,
} from "@/lib/finance/services/finance-forecast-formal-reforecast-service";
import { upsertForecastLine } from "@/lib/finance/services/finance-forecast-service";
import { adoptProjectionForYear } from "@/lib/finance/services/finance-projection-adoption-service";
import {
  baseRevisionStore,
  makeRevisionDb,
  revisionMockCtx,
  revisionMockTenantB,
  revisionMockYearId,
  type RevisionStore,
} from "@/lib/finance/__tests__/finance-04c-revision-mock-db";

vi.mock("@/lib/finance/services/finance-projection-staleness-resolver", () => ({
  resolveProjectionVersionStaleness: vi.fn(async () => "FRESH" as const),
}));

const { resolveProjectionVersionStaleness } = await import(
  "@/lib/finance/services/finance-projection-staleness-resolver"
);

const tenantA = "tenant-a";
const yearId = revisionMockYearId;
const accountIncome = "acc-income";
const accountExpense = "acc-expense";

type AdoptionRaceStore = {
  financeYear: Array<{
    id: string;
    tenantId: string;
    name: string;
    startDate: Date;
    endDate: Date;
  }>;
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
    revisionSource?: string | null;
    sourceProjectionVersionId?: string | null;
    previousVersionId?: string | null;
    actualsThroughDate?: Date | null;
    scenarioKey?: string | null;
  }>;
  financeForecastLine: Array<{
    id: string;
    forecastVersionId: string;
    financialAccountId: string;
    amountMinor: number;
  }>;
  financeProjectionAdoption: Array<Record<string, unknown>>;
};

function seedAdoptionRaceStore(): AdoptionRaceStore {
  return {
    financeYear: [
      {
        id: yearId,
        tenantId: tenantA,
        name: "FY 2026",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T00:00:00.000Z"),
      },
    ],
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
      {
        projectionVersionId: "pv-1",
        financialAccountId: accountIncome,
        projectedAmountMinor: 300_000_00,
      },
      {
        projectionVersionId: "pv-1",
        financialAccountId: accountExpense,
        projectedAmountMinor: 70_000_00,
      },
    ],
    financeForecast: [
      { id: "fc-1", tenantId: tenantA, financeYearId: yearId, currentVersionId: "fv-1" },
    ],
    financeForecastVersion: [{ id: "fv-1", forecastId: "fc-1", status: "CURRENT", versionNumber: 1 }],
    financeForecastLine: [
      {
        id: "fl-1",
        forecastVersionId: "fv-1",
        financialAccountId: accountIncome,
        amountMinor: 200_000_00,
      },
      {
        id: "fl-2",
        forecastVersionId: "fv-1",
        financialAccountId: accountExpense,
        amountMinor: 80_000_00,
      },
    ],
    financeProjectionAdoption: [],
  };
}

function makeAdoptionRaceDb(store: AdoptionRaceStore) {
  let forecastVersionSeq = 0;
  let forecastLineSeq = 0;
  let adoptionSeq = 0;

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
      findUnique: async ({
        where,
        select,
      }: {
        where: { id: string };
        select?: { actualsThroughDate?: boolean };
      }) => {
        const row = store.financeProjectionVersion.find((v) => v.id === where.id) ?? null;
        if (!row) return null;
        if (select?.actualsThroughDate) {
          return { actualsThroughDate: row.actualsThroughDate };
        }
        return row;
      },
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
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { forecastId?: string; status?: "SUPERSEDED" | "CURRENT" };
        orderBy?: { versionNumber: "desc" | "asc" };
      }) => {
        let rows = store.financeForecastVersion.filter((v) => {
          if (where.forecastId && v.forecastId !== where.forecastId) return false;
          if (where.status && v.status !== where.status) return false;
          return true;
        });
        if (orderBy?.versionNumber === "desc") {
          rows = [...rows].sort((a, b) => b.versionNumber - a.versionNumber);
        }
        return rows;
      },
      findFirst: async ({
        where,
      }: {
        where: { forecastId: string };
        orderBy: { versionNumber: "desc" };
      }) => {
        const rows = store.financeForecastVersion
          .filter((v) => v.forecastId === where.forecastId)
          .sort((a, b) => b.versionNumber - a.versionNumber);
        return rows[0] ?? null;
      },
      findUnique: async ({
        where,
        include,
      }: {
        where: { id: string };
        include?: {
          lines?: boolean;
          forecast?: { select?: { id?: boolean; tenantId?: boolean; financeYearId?: boolean } };
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
            ? {
                id: forecast.id,
                tenantId: forecast.tenantId,
                financeYearId: forecast.financeYearId,
              }
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
          revisionSource?: string | null;
          sourceProjectionVersionId?: string | null;
          previousVersionId?: string | null;
          actualsThroughDate?: Date | null;
          scenarioKey?: string | null;
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
          revisionSource: data.revisionSource ?? null,
          sourceProjectionVersionId: data.sourceProjectionVersionId ?? null,
          previousVersionId: data.previousVersionId ?? null,
          actualsThroughDate: data.actualsThroughDate ?? null,
          scenarioKey: data.scenarioKey ?? null,
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
    financeForecastLine: {
      findMany: async ({
        where,
        select,
      }: {
        where: { forecastVersionId: string };
        select?: { financialAccountId?: boolean; amountMinor?: boolean };
      }) => {
        const rows = store.financeForecastLine.filter(
          (l) => l.forecastVersionId === where.forecastVersionId,
        );
        if (select) {
          return rows.map((row) => {
            const picked: Record<string, unknown> = {};
            if (select.financialAccountId) picked.financialAccountId = row.financialAccountId;
            if (select.amountMinor) picked.amountMinor = row.amountMinor;
            return picked;
          });
        }
        return rows;
      },
    },
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
    financeProjectionEvidence: {},
    financeProjectionReasonCode: {},
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
  };
  return db;
}

describe("FIN-04C-07 release closure contract", () => {
  it("locks hardening scope and residual manual-edit boundary", () => {
    expect(ROLLING_FORECAST_FIN_04C_07_RELEASE_CLOSURE.packageCompletePendingPoUat).toBe(true);
    expect(ROLLING_FORECAST_FIN_04C_07_RELEASE_CLOSURE.noFin04dScope).toBe(true);
    expect(ROLLING_FORECAST_FIN_04C_07_RELEASE_CLOSURE.lineLevelOptimisticConcurrencyDeferred).toBe(
      true,
    );
    expect(ROLLING_FORECAST_CONCURRENCY_CONTRACT.formalReforecastRequiresExpectedCurrentVersionId).toBe(
      true,
    );
    expect(ROLLING_FORECAST_PRODUCT_PRINCIPLE).toContain("LIVING MANAGEMENT VIEW");
    expect(ROLLING_FORECAST_FIN_04C_06_CLARITY_PRINCIPLES.conclusionsFirst).toContain(
      "conclusions first",
    );
  });
});

describe("FIN-04C-07 formal reforecast concurrency & idempotency", () => {
  let store: RevisionStore;

  beforeEach(() => {
    store = baseRevisionStore();
  });

  it("allows only one winner when two requests share the same expected CURRENT", async () => {
    const db = makeRevisionDb(store);
    const first = await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-04-30",
    });
    await expect(
      formalizeCurrentForecast(db, revisionMockCtx(), {
        financeYearId: revisionMockYearId,
        expectedCurrentForecastVersionId: "fv-current",
        asOfDate: "2026-05-31",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_REVISION_STALE_CURRENT" });

    expect(store.financeForecastVersion.filter((v) => v.status === "CURRENT")).toHaveLength(1);
    expect(store.financeForecast[0]!.currentVersionId).toBe(first.currentVersionId);
    expect(store.financeForecastVersion).toHaveLength(2);
  });

  it("maintains monotonic version numbers across four sequential formalizations", async () => {
    const db = makeRevisionDb(store);
    let expectedId = "fv-current";
    const promotedIds: string[] = [];
    for (let step = 0; step < 3; step += 1) {
      const result = await formalizeCurrentForecast(db, revisionMockCtx(), {
        financeYearId: revisionMockYearId,
        expectedCurrentForecastVersionId: expectedId,
        asOfDate: `2026-0${step + 4}-28`,
      });
      promotedIds.push(result.currentVersionId);
      expectedId = result.currentVersionId;
    }
    const versions = store.financeForecastVersion.sort(
      (a, b) => a.versionNumber - b.versionNumber,
    );
    expect(versions.map((v) => v.versionNumber)).toEqual([1, 2, 3, 4]);
    const v4 = versions.find((v) => v.versionNumber === 4)!;
    const v3 = versions.find((v) => v.versionNumber === 3)!;
    expect(v4.previousVersionId).toBe(v3.id);
    expect(v4.scenarioKey ?? null).toBeNull();
  });

  it("rejects duplicate persistFormalForecastRevision against stale CURRENT", async () => {
    const db = makeRevisionDb(store);
    await persistFormalForecastRevision(db, {
      tenantId: tenantA,
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-04-30",
      actualsThroughDate: "2026-03-31",
      revisionSource: "MANUAL_REFORECAST",
    });
    await expect(
      persistFormalForecastRevision(db, {
        tenantId: tenantA,
        financeYearId: revisionMockYearId,
        expectedCurrentForecastVersionId: "fv-current",
        asOfDate: "2026-05-31",
        actualsThroughDate: "2026-04-30",
        revisionSource: "MANUAL_REFORECAST",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_REVISION_STALE_CURRENT" });
  });
});

describe("FIN-04C-07 adoption vs formal reforecast races", () => {
  beforeEach(() => {
    vi.mocked(resolveProjectionVersionStaleness).mockResolvedValue("FRESH");
  });

  it("blocks adoption when formal reforecast superseded the expected source CURRENT", async () => {
    const store = seedAdoptionRaceStore();
    const db = makeAdoptionRaceDb(store);
    await formalizeCurrentForecast(db as never, revisionMockCtx(), {
      financeYearId: yearId,
      expectedCurrentForecastVersionId: "fv-1",
      asOfDate: "2026-07-31",
    });
    await expect(
      adoptProjectionForYear(db as never, revisionMockCtx(), {
        financeYearId: yearId,
        expectedSourceForecastVersionId: "fv-1",
        expectedProjectionVersionId: "pv-1",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_ADOPTION_FORECAST_CHANGED" });
    expect(store.financeProjectionAdoption).toHaveLength(0);
    expect(store.financeForecastVersion.filter((v) => v.status === "CURRENT")).toHaveLength(1);
  });

  it("blocks stale formalization when adoption already promoted CURRENT", async () => {
    const store = seedAdoptionRaceStore();
    const db = makeAdoptionRaceDb(store);
    await adoptProjectionForYear(db as never, revisionMockCtx(), {
      financeYearId: yearId,
      expectedSourceForecastVersionId: "fv-1",
      expectedProjectionVersionId: "pv-1",
    });
    await expect(
      formalizeCurrentForecast(db as never, revisionMockCtx(), {
        financeYearId: yearId,
        expectedCurrentForecastVersionId: "fv-1",
        asOfDate: "2026-08-31",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_REVISION_STALE_CURRENT" });
    expect(store.financeForecastVersion.filter((v) => v.status === "CURRENT")).toHaveLength(1);
    expect(store.financeProjectionAdoption).toHaveLength(1);
  });

  it("blocks duplicate successful adoption against the same stale inputs", async () => {
    const store = seedAdoptionRaceStore();
    const db = makeAdoptionRaceDb(store);
    await adoptProjectionForYear(db as never, revisionMockCtx(), {
      financeYearId: yearId,
      expectedSourceForecastVersionId: "fv-1",
      expectedProjectionVersionId: "pv-1",
    });
    await expect(
      adoptProjectionForYear(db as never, revisionMockCtx(), {
        financeYearId: yearId,
        expectedSourceForecastVersionId: "fv-1",
        expectedProjectionVersionId: "pv-1",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_ADOPTION_FORECAST_CHANGED" });
    expect(store.financeProjectionAdoption).toHaveLength(1);
  });
});

describe("FIN-04C-07 snapshot & amount integrity", () => {
  it("preserves zero and negative amounts in snapshot mapping", () => {
    const mapped = mapForecastLinesForSnapshot([
      { financialAccountId: "a", amountMinor: 0 },
      { financialAccountId: "b", amountMinor: -50_00 },
      { financialAccountId: "c", amountMinor: 100_00 },
    ]);
    expect(mapped).toEqual([
      { financialAccountId: "a", amountMinor: 0 },
      { financialAccountId: "b", amountMinor: -50_00 },
      { financialAccountId: "c", amountMinor: 100_00 },
    ]);
  });

  it("formalizes edited negative line faithfully", async () => {
    const store = baseRevisionStore();
    const db = makeRevisionDb(store);
    await upsertForecastLine(db, revisionMockCtx(), {
      forecastVersionId: "fv-current",
      financialAccountId: "acc-income",
      amountMinor: -25_00,
    });
    const result = await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-06-30",
    });
    const line = store.financeForecastLine.find(
      (l) =>
        l.forecastVersionId === result.currentVersionId && l.financialAccountId === "acc-income",
    );
    expect(line?.amountMinor).toBe(-25_00);
  });

  it("snapshots last committed CURRENT lines after in-place edit before formalization", async () => {
    const store = baseRevisionStore();
    const db = makeRevisionDb(store);
    await upsertForecastLine(db, revisionMockCtx(), {
      forecastVersionId: "fv-current",
      financialAccountId: "acc-income",
      amountMinor: 175_00,
    });
    const result = await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-06-30",
    });
    const promoted = store.financeForecastLine.find(
      (l) => l.forecastVersionId === result.currentVersionId && l.financialAccountId === "acc-income",
    );
    expect(promoted?.amountMinor).toBe(175_00);
    expect(store.financeForecastLine.filter((l) => l.forecastVersionId === result.currentVersionId)).toHaveLength(
      2,
    );
  });
});

describe("FIN-04C-07 revision reason & context hardening", () => {
  it("enforces server-side context length and whitespace normalization", () => {
    const reason = parseFormalReforecastRevisionReasonInput("OTHER");
    const longContext = "x".repeat(FORMAL_REFORECAST_REVISION_CONTEXT_MAX_LENGTH + 1);
    expect(() =>
      validateFormalReforecastRevisionContext({ revisionReason: reason, revisionContext: longContext }),
    ).toThrow(FinanceDomainError);
    const normalized = validateFormalReforecastRevisionContext({
      revisionReason: reason,
      revisionContext: "  Board decision  ",
    });
    expect(normalized.revisionContext).toBe("Board decision");
  });

  it("maps revision reasons to tenant-facing labels, not raw enum strings", () => {
    for (const reason of Object.values(FORECAST_REVISION_REASON_PRESENTATION)) {
      expect(reason.label).not.toMatch(/^[A-Z_]+$/);
      expect(reason.label.length).toBeGreaterThan(3);
    }
  });
});

describe("FIN-04C-07 tenant isolation regression", () => {
  it("rejects cross-tenant formalization", async () => {
    const db = makeRevisionDb(baseRevisionStore());
    await expect(
      formalizeCurrentForecast(db, revisionMockCtx({ tenantId: revisionMockTenantB }), {
        financeYearId: revisionMockYearId,
        expectedCurrentForecastVersionId: "fv-current",
        asOfDate: "2026-04-30",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });
  });
});

describe("FIN-04C-07 architecture & UX regression guards", () => {
  const financeComponents = [
    "components/admin/finance/FinanceForecastRollingUxSections.tsx",
    "components/admin/finance/FinanceForecastWorkspacePanel.tsx",
    "components/admin/finance/FinanceProjectionWorkspaceSection.tsx",
  ];

  it("keeps canonical current pointer resolution in forecast services", () => {
    const sources = [
      "lib/finance/services/finance-forecast-query-service.ts",
      "lib/finance/services/finance-forecast-history-query-service.ts",
      "lib/finance/services/finance-projection-adoption-service.ts",
      "lib/finance/services/finance-forecast-formal-reforecast-service.ts",
    ].map((path) => readFileSync(join(process.cwd(), path), "utf8"));
    for (const source of sources) {
      expect(source).toContain("resolveCanonicalCurrentForecastVersionByPointer");
    }
  });

  it("does not introduce binary checkboxes in FIN-04C finance workspace surfaces", () => {
    for (const path of financeComponents) {
      const source = readFileSync(join(process.cwd(), path), "utf8");
      expect(source).not.toContain('type="checkbox"');
    }
  });

  it("retains formal reforecast dialog progressive disclosure and natural-height contract", () => {
    const dialog = readFileSync(
      join(process.cwd(), "components/admin/finance/FinanceForecastRollingUxSections.tsx"),
      "utf8",
    );
    expect(dialog).toContain("aria-expanded");
    expect(dialog).toContain("data-finance-formal-reforecast-more-details-trigger");
    expect(dialog).toContain("data-finance-formal-reforecast-preview");
    expect(dialog).toContain("FINANCE_FORMAL_REFORECAST_DIALOG_SHELL_CLASS");
    expect(dialog).toContain("FINANCE_FORMAL_REFORECAST_DIALOG_BODY_CLASS");
  });
});
