import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";

export const revisionMockTenantA = "tenant-a";
export const revisionMockTenantB = "tenant-b";
export const revisionMockYearId = "fy-2026";
export const revisionMockNonCalendarYearId = "fy-nc-2025";

export type RevisionStore = {
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
  financeProjectionAdoption: Array<Record<string, unknown>>;
  financialAccount: Array<{
    id: string;
    tenantId: string;
    canonicalSemantic: string;
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
};

export function revisionMockCtx(overrides?: Partial<FinanceAuthContext>): FinanceAuthContext {
  return {
    tenantId: revisionMockTenantA,
    userId: "user-1",
    permissionKeys: new Set(["finance.forecast.view", "finance.forecast.manage"]),
    ...overrides,
  };
}

export function baseRevisionStore(): RevisionStore {
  return {
    financeYear: [
      {
        id: revisionMockYearId,
        tenantId: revisionMockTenantA,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T00:00:00.000Z"),
      },
      {
        id: revisionMockNonCalendarYearId,
        tenantId: revisionMockTenantA,
        startDate: new Date("2025-07-01T00:00:00.000Z"),
        endDate: new Date("2026-06-30T00:00:00.000Z"),
      },
    ],
    financeForecast: [
      {
        id: "forecast-1",
        tenantId: revisionMockTenantA,
        financeYearId: revisionMockYearId,
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
      { id: "proj-1", tenantId: revisionMockTenantA, financeYearId: revisionMockYearId },
      {
        id: "proj-wrong-year",
        tenantId: revisionMockTenantA,
        financeYearId: revisionMockNonCalendarYearId,
      },
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
    financeProjectionAdoption: [],
    financialAccount: [
      {
        id: "acc-income",
        tenantId: revisionMockTenantA,
        canonicalSemantic: "INCOME",
        lifecycle: "ACTIVE",
      },
      {
        id: "acc-expense",
        tenantId: revisionMockTenantA,
        canonicalSemantic: "EXPENSE",
        lifecycle: "ARCHIVED",
      },
    ],
  };
}

export function makeRevisionDb(store: RevisionStore) {
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
      findMany: async ({
        where,
        orderBy,
        select,
      }: {
        where: { forecastId?: string; status?: "SUPERSEDED" | "CURRENT" };
        orderBy?: { versionNumber: "desc" | "asc" };
        select?: Record<string, boolean>;
      }) => {
        let rows = store.financeForecastVersion.filter((v) => {
          if (where.forecastId && v.forecastId !== where.forecastId) return false;
          if (where.status && v.status !== where.status) return false;
          return true;
        });
        if (orderBy?.versionNumber === "desc") {
          rows = [...rows].sort((a, b) => b.versionNumber - a.versionNumber);
        }
        if (select) {
          return rows.map((row) => {
            const picked: Record<string, unknown> = {};
            for (const key of Object.keys(select)) {
              if (select[key]) picked[key] = (row as Record<string, unknown>)[key];
            }
            return picked;
          });
        }
        return rows;
      },
      findFirst: async ({
        where,
        select,
      }: {
        where: { forecastId: string };
        orderBy: { versionNumber: "desc" };
        select?: { versionNumber?: boolean };
      }) => {
        const rows = store.financeForecastVersion
          .filter((v) => v.forecastId === where.forecastId)
          .sort((a, b) => b.versionNumber - a.versionNumber);
        const row = rows[0] ?? null;
        if (!row) return null;
        if (select?.versionNumber) return { versionNumber: row.versionNumber };
        return row;
      },
      findUnique: async ({
        where,
        include,
        select,
      }: {
        where: { id: string };
        include?: {
          lines?: boolean;
          forecast?: { select: { id?: boolean; tenantId?: boolean; financeYearId?: boolean } };
        };
        select?: Record<string, boolean>;
      }) => {
        const row = store.financeForecastVersion.find((v) => v.id === where.id);
        if (!row) return null;
        if (select) {
          const picked: Record<string, unknown> = {};
          for (const key of Object.keys(select)) {
            if (select[key]) picked[key] = (row as Record<string, unknown>)[key];
          }
          return picked;
        }
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
          return rows.map((row) => ({
            financialAccountId: row.financialAccountId,
            amountMinor: row.amountMinor,
          }));
        }
        return rows;
      },
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
    financeProjectionAdoption: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        store.financeProjectionAdoption.push(data);
        return data;
      },
    },
    financeBudget: { findUnique: async () => null },
    financeBudgetVersion: { findUnique: async () => null },
    financeBudgetLine: {},
    financialAccount: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financialAccount.find((a) => a.id === where.id) ?? null,
      findMany: async ({ where }: { where: { tenantId: string } }) =>
        store.financialAccount.filter((a) => a.tenantId === where.tenantId),
    },
    $transaction: async <T>(fn: (tx: typeof db) => Promise<T>) => fn(db),
  };

  return db;
}
