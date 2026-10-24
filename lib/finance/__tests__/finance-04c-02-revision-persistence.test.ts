import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  assertFinanceCalendarDateWithinFinanceYear,
  parseFinanceCalendarDateIso,
} from "@/lib/finance/dates/finance-calendar-date";
import { FinanceDomainError } from "@/lib/finance/errors";
import { validateFormalRevisionMetadata } from "@/lib/finance/forecast/forecast-revision-metadata-validation";
import {
  validatePreviousForecastVersionLineage,
  validateSourceProjectionVersionProvenance,
} from "@/lib/finance/forecast/forecast-revision-lineage-validation";
import { ROLLING_FORECAST_FIN_04C_02_PERSISTENCE } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import {
  createForecastForYear,
  resolveCanonicalCurrentForecastVersionByPointer,
  upsertForecastLine,
} from "@/lib/finance/services/finance-forecast-service";
import { persistFormalForecastRevision } from "@/lib/finance/services/finance-forecast-revision-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const yearId = "fy-2026";
const nonCalendarYearId = "fy-nc-2025";

type RevisionStore = {
  financeYear: Array<{
    id: string;
    tenantId: string;
    startDate: Date;
    endDate: Date;
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
    scenarioKey?: string | null;
    revisionSource?: string | null;
    revisionLabel?: string | null;
    note?: string | null;
    asOfDate?: Date | null;
    actualsThroughDate?: Date | null;
    previousVersionId?: string | null;
    sourceProjectionVersionId?: string | null;
    createdByUserId?: string | null;
    createdAt?: Date;
  }>;
  financeForecastLine: Array<{
    id: string;
    forecastVersionId: string;
    financialAccountId: string;
    amountMinor: number;
  }>;
  financeProjection: Array<{
    id: string;
    tenantId: string;
    financeYearId: string;
  }>;
  financeProjectionVersion: Array<{
    id: string;
    financeProjectionId: string;
    actualsThroughDate?: Date;
  }>;
  financialAccount: Array<{
    id: string;
    tenantId: string;
    canonicalSemantic: string;
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
};

function ctx(overrides?: Partial<FinanceAuthContext>): FinanceAuthContext {
  return {
    tenantId: tenantA,
    userId: "user-1",
    permissionKeys: new Set(["finance.forecast.view", "finance.forecast.manage"]),
    ...overrides,
  };
}

function makeRevisionDb(store: RevisionStore) {
  let versionSeq = 0;
  let lineSeq = 0;
  let forecastSeq = 0;

  const db = {
    financeYear: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeYear.find((y) => y.id === where.id) ?? null,
    },
    financeForecast: {
      findUnique: async ({
        where,
        include,
        select,
      }: {
        where:
          | { tenantId_financeYearId: { tenantId: string; financeYearId: string } }
          | { id: string };
        include?: { currentVersion?: { include?: { lines?: boolean } } };
        select?: { id?: boolean; currentVersionId?: boolean; tenantId?: boolean };
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
        if (select) {
          return {
            id: forecast.id,
            currentVersionId: forecast.currentVersionId,
            tenantId: forecast.tenantId,
          };
        }
        const currentVersion = forecast.currentVersionId
          ? store.financeForecastVersion.find((v) => v.id === forecast.currentVersionId)
          : null;
        return {
          ...forecast,
          currentVersion: include?.currentVersion
            ? {
                ...currentVersion,
                lines: include.currentVersion.include?.lines
                  ? store.financeForecastLine.filter(
                      (l) => l.forecastVersionId === currentVersion?.id,
                    )
                  : undefined,
              }
            : undefined,
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
        if (data.currentVersionId !== undefined) row.currentVersionId = data.currentVersionId;
        return row;
      },
      create: async ({
        data,
      }: {
        data: { tenantId: string; financeYearId: string; createdByUserId?: string };
      }) => {
        forecastSeq += 1;
        const row = {
          id: `ff-${forecastSeq}`,
          tenantId: data.tenantId,
          financeYearId: data.financeYearId,
          currentVersionId: null as string | null,
        };
        store.financeForecast.push(row);
        return row;
      },
    },
    financeForecastVersion: {
      findFirst: async ({
        where,
        orderBy,
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
          forecast?: { select: { id?: boolean; tenantId?: boolean; financeYearId?: boolean } };
        };
      }) => {
        const row = store.financeForecastVersion.find((v) => v.id === where.id);
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
      create: async ({ data }: { data: Record<string, unknown> }) => {
        versionSeq += 1;
        const id = `fv-${versionSeq}`;
        const row = {
          id,
          forecastId: data.forecastId as string,
          status: data.status as "CURRENT" | "SUPERSEDED",
          versionNumber: data.versionNumber as number,
          scenarioKey: (data.scenarioKey as string | null | undefined) ?? null,
          revisionSource: (data.revisionSource as string | null | undefined) ?? null,
          revisionLabel: (data.revisionLabel as string | null | undefined) ?? null,
          note: (data.note as string | null | undefined) ?? null,
          asOfDate: (data.asOfDate as Date | null | undefined) ?? null,
          actualsThroughDate: (data.actualsThroughDate as Date | null | undefined) ?? null,
          previousVersionId: (data.previousVersionId as string | null | undefined) ?? null,
          sourceProjectionVersionId:
            (data.sourceProjectionVersionId as string | null | undefined) ?? null,
          createdByUserId: (data.createdByUserId as string | null | undefined) ?? null,
          createdAt: new Date("2026-04-01T10:00:00.000Z"),
        };
        store.financeForecastVersion.push(row);
        const lines = data.lines as
          | { create: Array<{ financialAccountId: string; amountMinor: number }> }
          | undefined;
        for (const line of lines?.create ?? []) {
          lineSeq += 1;
          store.financeForecastLine.push({
            id: `fl-${lineSeq}`,
            forecastVersionId: id,
            financialAccountId: line.financialAccountId,
            amountMinor: line.amountMinor,
          });
        }
        return { id, ...row };
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
        create: { forecastVersionId: string; financialAccountId: string; amountMinor: number };
        update: { amountMinor: number };
      }) => {
        const existing = store.financeForecastLine.find(
          (l) =>
            l.forecastVersionId === where.forecastVersionId_financialAccountId.forecastVersionId &&
            l.financialAccountId === where.forecastVersionId_financialAccountId.financialAccountId,
        );
        if (existing) {
          existing.amountMinor = update.amountMinor;
          return existing;
        }
        lineSeq += 1;
        const row = { id: `fl-${lineSeq}`, ...create };
        store.financeForecastLine.push(row);
        return row;
      },
    },
    financeProjectionVersion: {
      findUnique: async ({
        where,
        include,
      }: {
        where: { id: string };
        include?: { financeProjection?: { select: { tenantId?: boolean; financeYearId?: boolean } } };
      }) => {
        const row = store.financeProjectionVersion.find((v) => v.id === where.id);
        if (!row) return null;
        const projection = store.financeProjection.find((p) => p.id === row.financeProjectionId)!;
        return {
          ...row,
          financeProjection: include?.financeProjection
            ? { tenantId: projection.tenantId, financeYearId: projection.financeYearId }
            : undefined,
        };
      },
    },
    financeProjection: {},
    financeBudget: { findUnique: async () => null },
    financeBudgetVersion: { findUnique: async () => null },
    financeBudgetLine: {},
    financialAccount: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financialAccount.find((a) => a.id === where.id) ?? null,
    },
    $transaction: async <T>(fn: (tx: typeof db) => Promise<T>) => fn(db),
  };

  return db;
}

function baseStore(): RevisionStore {
  return {
    financeYear: [
      {
        id: yearId,
        tenantId: tenantA,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T00:00:00.000Z"),
      },
      {
        id: nonCalendarYearId,
        tenantId: tenantA,
        startDate: new Date("2025-07-01T00:00:00.000Z"),
        endDate: new Date("2026-06-30T00:00:00.000Z"),
      },
    ],
    financeForecast: [
      {
        id: "forecast-1",
        tenantId: tenantA,
        financeYearId: yearId,
        currentVersionId: "fv-current",
      },
    ],
    financeForecastVersion: [
      {
        id: "fv-current",
        forecastId: "forecast-1",
        status: "CURRENT",
        versionNumber: 1,
        revisionSource: null,
        createdAt: new Date("2026-01-15T10:00:00.000Z"),
      },
    ],
    financeForecastLine: [
      {
        id: "fl-1",
        forecastVersionId: "fv-current",
        financialAccountId: "acc-income",
        amountMinor: 100_00,
      },
      {
        id: "fl-2",
        forecastVersionId: "fv-current",
        financialAccountId: "acc-expense",
        amountMinor: 0,
      },
    ],
    financeProjection: [
      { id: "proj-1", tenantId: tenantA, financeYearId: yearId },
      { id: "proj-wrong-year", tenantId: tenantA, financeYearId: nonCalendarYearId },
    ],
    financeProjectionVersion: [
      {
        id: "pv-1",
        financeProjectionId: "proj-1",
        actualsThroughDate: new Date("2026-03-31T00:00:00.000Z"),
      },
      {
        id: "pv-wrong-tenant",
        financeProjectionId: "proj-wrong-year",
      },
    ],
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
        lifecycle: "ARCHIVED",
      },
    ],
  };
}

describe("FIN-04C-02 persistence contract", () => {
  it("documents implemented FIN-04C-02 primitives", () => {
    expect(ROLLING_FORECAST_FIN_04C_02_PERSISTENCE.financeForecastVersionRevisionMetadataPersisted).toBe(
      true,
    );
    expect(ROLLING_FORECAST_FIN_04C_02_PERSISTENCE.manualLineEditUsesUpsertForecastLineInPlace).toBe(
      true,
    );
  });

  it("keeps legacy revision metadata nullable in migration SQL", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "prisma/migrations/20261024120000_sce_finance_04c_02_forecast_revision_lifecycle/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("FinanceForecastRevisionSource");
    expect(sql).not.toMatch(/UPDATE\s+"FinanceForecastVersion"/i);
  });
});

describe("FIN-04C-02 formal revision lifecycle", () => {
  let store: RevisionStore;

  beforeEach(() => {
    store = baseStore();
  });

  it("transitions CURRENT → SUPERSEDED and promotes a full snapshot with metadata", async () => {
    const db = makeRevisionDb(store);
    const result = await persistFormalForecastRevision(db, {
      tenantId: tenantA,
      financeYearId: yearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-04-30",
      actualsThroughDate: "2026-03-31",
      revisionSource: "MANUAL_REFORECAST",
      revisionLabel: "Q1 Review",
      createdByUserId: "user-1",
    });

    expect(result.newVersionNumber).toBe(2);
    expect(store.financeForecast[0]!.currentVersionId).toBe(result.newCurrentVersionId);

    const superseded = store.financeForecastVersion.find((v) => v.id === "fv-current")!;
    expect(superseded.status).toBe("SUPERSEDED");

    const current = store.financeForecastVersion.find((v) => v.id === result.newCurrentVersionId)!;
    expect(current.status).toBe("CURRENT");
    expect(current.revisionSource).toBe("MANUAL_REFORECAST");
    expect(current.previousVersionId).toBe("fv-current");
    expect(current.asOfDate?.toISOString().slice(0, 10)).toBe("2026-04-30");

    const newLines = store.financeForecastLine.filter(
      (l) => l.forecastVersionId === result.newCurrentVersionId,
    );
    expect(newLines).toHaveLength(2);
    expect(newLines.find((l) => l.financialAccountId === "acc-expense")?.amountMinor).toBe(0);
  });

  it("supports repeated transitions with lineage v1 → v2 → v3", async () => {
    const db = makeRevisionDb(store);
    const first = await persistFormalForecastRevision(db, {
      tenantId: tenantA,
      financeYearId: yearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-04-30",
      actualsThroughDate: "2026-03-31",
      revisionSource: "MANUAL_REFORECAST",
    });
    const second = await persistFormalForecastRevision(db, {
      tenantId: tenantA,
      financeYearId: yearId,
      expectedCurrentForecastVersionId: first.newCurrentVersionId,
      asOfDate: "2026-07-31",
      actualsThroughDate: "2026-06-30",
      revisionSource: "MANUAL_REFORECAST",
    });

    expect(second.newVersionNumber).toBe(3);
    const currentVersions = store.financeForecastVersion.filter((v) => v.status === "CURRENT");
    expect(currentVersions).toHaveLength(1);
    const promoted = store.financeForecastVersion.find((v) => v.id === second.newCurrentVersionId)!;
    expect(promoted.previousVersionId).toBe(first.newCurrentVersionId);
  });

  it("rejects stale expected current version (duplicate submit protection)", async () => {
    const db = makeRevisionDb(store);
    await persistFormalForecastRevision(db, {
      tenantId: tenantA,
      financeYearId: yearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-04-30",
      actualsThroughDate: "2026-03-31",
      revisionSource: "MANUAL_REFORECAST",
    });
    await expect(
      persistFormalForecastRevision(db, {
        tenantId: tenantA,
        financeYearId: yearId,
        expectedCurrentForecastVersionId: "fv-current",
        asOfDate: "2026-05-31",
        actualsThroughDate: "2026-04-30",
        revisionSource: "MANUAL_REFORECAST",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_REVISION_STALE_CURRENT" });
  });
});

describe("FIN-04C-02 manual edit vs formal revision", () => {
  it("mutates CURRENT in place without creating a new version", async () => {
    const store = baseStore();
    const db = makeRevisionDb(store);
    await upsertForecastLine(db, ctx(), {
      forecastVersionId: "fv-current",
      financialAccountId: "acc-income",
      amountMinor: 150_00,
    });
    expect(store.financeForecastVersion).toHaveLength(1);
    expect(
      store.financeForecastLine.find((l) => l.forecastVersionId === "fv-current")?.amountMinor,
    ).toBe(150_00);
  });

  it("rejects edits on SUPERSEDED versions", async () => {
    const store = baseStore();
    store.financeForecastVersion[0]!.status = "SUPERSEDED";
    const db = makeRevisionDb(store);
    await expect(
      upsertForecastLine(db, ctx(), {
        forecastVersionId: "fv-current",
        financialAccountId: "acc-income",
        amountMinor: 150_00,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_IMMUTABLE" });
  });
});

describe("FIN-04C-02 date semantics", () => {
  it("accepts dates within a non-calendar finance year", () => {
    const year = {
      startDate: new Date("2025-07-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T00:00:00.000Z"),
    };
    const parsed = validateFormalRevisionMetadata(
      {
        asOfDate: "2026-03-15",
        actualsThroughDate: "2026-02-28",
        revisionSource: "MANUAL_REFORECAST",
      },
      year,
    );
    expect(parsed.asOfDate.toISOString().slice(0, 10)).toBe("2026-03-15");
  });

  it("rejects actualsThroughDate after asOfDate and dates outside finance year", () => {
    const year = {
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    };
    expect(() =>
      validateFormalRevisionMetadata(
        {
          asOfDate: "2026-03-01",
          actualsThroughDate: "2026-04-01",
          revisionSource: "MANUAL_REFORECAST",
        },
        year,
      ),
    ).toThrow(FinanceDomainError);
    expect(() =>
      validateFormalRevisionMetadata(
        {
          asOfDate: "2027-01-01",
          actualsThroughDate: "2026-12-31",
          revisionSource: "MANUAL_REFORECAST",
        },
        year,
      ),
    ).toThrow(FinanceDomainError);
  });

  it("keeps createdAt independent from asOfDate on versions", async () => {
    const store = baseStore();
    const db = makeRevisionDb(store);
    await persistFormalForecastRevision(db, {
      tenantId: tenantA,
      financeYearId: yearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-09-30",
      actualsThroughDate: "2026-08-31",
      revisionSource: "MANUAL_REFORECAST",
    });
    const legacy = store.financeForecastVersion.find((v) => v.id === "fv-current")!;
    const promoted = store.financeForecastVersion.find((v) => v.status === "CURRENT")!;
    expect(legacy.createdAt?.toISOString()).toBe("2026-01-15T10:00:00.000Z");
    expect(promoted.asOfDate?.toISOString().slice(0, 10)).toBe("2026-09-30");
    expect(promoted.createdAt?.toISOString()).not.toBe(promoted.asOfDate?.toISOString());
  });
});

describe("FIN-04C-02 tenant and finance year isolation", () => {
  it("rejects cross-tenant forecast year and projection provenance", async () => {
    const store = baseStore();
    store.financeProjection.push({ id: "proj-b", tenantId: tenantB, financeYearId: yearId });
    store.financeProjectionVersion.push({
      id: "pv-tenant-b",
      financeProjectionId: "proj-b",
    });
    const db = makeRevisionDb(store);

    await expect(
      persistFormalForecastRevision(db, {
        tenantId: tenantB,
        financeYearId: yearId,
        expectedCurrentForecastVersionId: "fv-current",
        asOfDate: "2026-04-30",
        actualsThroughDate: "2026-03-31",
        revisionSource: "MANUAL_REFORECAST",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });

    await expect(
      validateSourceProjectionVersionProvenance(db, {
        tenantId: tenantA,
        financeYearId: yearId,
        sourceProjectionVersionId: "pv-tenant-b",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });
  });

  it("rejects cross-finance-year lineage and projection references", async () => {
    const store = baseStore();
    store.financeForecastVersion.push({
      id: "fv-other-forecast",
      forecastId: "forecast-other",
      status: "SUPERSEDED",
      versionNumber: 1,
    });
    store.financeForecast.push({
      id: "forecast-other",
      tenantId: tenantA,
      financeYearId: nonCalendarYearId,
      currentVersionId: null,
    });
    const db = makeRevisionDb(store);

    await expect(
      validatePreviousForecastVersionLineage(db, {
        tenantId: tenantA,
        financeYearId: yearId,
        forecastId: "forecast-1",
        expectedPreviousVersionId: "fv-other-forecast",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_REVISION_INVALID_LINEAGE" });

    await expect(
      validateSourceProjectionVersionProvenance(db, {
        tenantId: tenantA,
        financeYearId: yearId,
        sourceProjectionVersionId: "pv-wrong-tenant",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_REVISION_INVALID_PROJECTION_SOURCE" });
  });
});

describe("FIN-04C-02 canonical current pointer", () => {
  it("resolves current via FinanceForecast.currentVersionId only", async () => {
    const store = baseStore();
    store.financeForecastVersion.push({
      id: "fv-decoy-higher-number",
      forecastId: "forecast-1",
      status: "SUPERSEDED",
      versionNumber: 99,
    });
    const db = makeRevisionDb(store);
    const forecast = store.financeForecast[0]!;
    const resolved = await resolveCanonicalCurrentForecastVersionByPointer(db, ctx(), forecast);
    expect(resolved?.id).toBe("fv-current");
    expect(resolved?.id).not.toBe("fv-decoy-higher-number");
  });
});

describe("FIN-04C-02 initial forecast revision source", () => {
  it("sets INITIAL_FORECAST on newly created forecasts", async () => {
    const store: RevisionStore = {
      ...baseStore(),
      financeForecast: [],
      financeForecastVersion: [],
      financeForecastLine: [],
    };
    const db = makeRevisionDb(store);
    await createForecastForYear(db, ctx(), { financeYearId: yearId, mode: "EMPTY" });
    expect(store.financeForecastVersion[0]?.revisionSource).toBe("INITIAL_FORECAST");
  });
});

describe("FIN-04C-02 calendar date helpers", () => {
  it("validates inclusive finance year boundaries without timezone drift", () => {
    const date = parseFinanceCalendarDateIso("2026-06-30");
    assertFinanceCalendarDateWithinFinanceYear(
      date,
      {
        startDate: new Date("2025-07-01T00:00:00.000Z"),
        endDate: new Date("2026-06-30T00:00:00.000Z"),
      },
      "asOfDate",
    );
    expect(date.toISOString()).toBe("2026-06-30T00:00:00.000Z");
  });
});
