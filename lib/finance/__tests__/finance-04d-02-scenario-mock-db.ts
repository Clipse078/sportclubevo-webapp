import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";

export const scenarioTenantA = "tenant-a";
export const scenarioTenantB = "tenant-b";
export const scenarioYearId = "fy-2026";

export function scenarioCtx(overrides?: Partial<FinanceAuthContext>): FinanceAuthContext {
  return {
    tenantId: scenarioTenantA,
    userId: "user-1",
    permissionKeys: new Set(["finance.forecast.view", "finance.forecast.manage"]),
    ...overrides,
  };
}

export type ScenarioStore = {
  financeYear: Array<{ id: string; tenantId: string }>;
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
    asOfDate?: Date | null;
    actualsThroughDate?: Date | null;
    scenarioKey?: string | null;
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
  financeScenario: Array<{
    id: string;
    tenantId: string;
    financeYearId: string;
    name: string;
    description: string | null;
    sourceForecastId: string;
    sourceForecastVersionId: string;
    baselineAsOfDate: Date | null;
    baselineActualsThroughDate: Date | null;
    createdByUserId: string | null;
    updatedByUserId: string | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  financeScenarioBaselineLine: Array<{
    id: string;
    scenarioId: string;
    financialAccountId: string;
    amountMinor: number;
  }>;
  financeScenarioAssumption: Array<{
    id: string;
    scenarioId: string;
    financialAccountId: string;
    kind: string;
    percentBasisPoints: number | null;
    amountMinorDelta: number | null;
    absoluteAmountMinor: number | null;
    note: string | null;
  }>;
};

export function createEmptyScenarioStore(): ScenarioStore {
  return {
    financeYear: [{ id: scenarioYearId, tenantId: scenarioTenantA }],
    financeForecast: [],
    financeForecastVersion: [],
    financeForecastLine: [],
    financialAccount: [
      { id: "acc-income", tenantId: scenarioTenantA, canonicalSemantic: "INCOME", lifecycle: "ACTIVE" },
      { id: "acc-expense", tenantId: scenarioTenantA, canonicalSemantic: "EXPENSE", lifecycle: "ACTIVE" },
      { id: "acc-archived", tenantId: scenarioTenantA, canonicalSemantic: "EXPENSE", lifecycle: "ARCHIVED" },
      { id: "acc-other-tenant", tenantId: scenarioTenantB, canonicalSemantic: "INCOME", lifecycle: "ACTIVE" },
    ],
    financeScenario: [],
    financeScenarioBaselineLine: [],
    financeScenarioAssumption: [],
  };
}

export function seedCurrentForecast(
  store: ScenarioStore,
  lines: Array<{ financialAccountId: string; amountMinor: number }>,
  versionId = "fv-v1",
) {
  store.financeForecast.push({
    id: "ff-1",
    tenantId: scenarioTenantA,
    financeYearId: scenarioYearId,
    currentVersionId: versionId,
  });
  store.financeForecastVersion.push({
    id: versionId,
    forecastId: "ff-1",
    status: "CURRENT",
    versionNumber: 1,
    asOfDate: new Date("2026-06-01"),
    actualsThroughDate: new Date("2026-05-31"),
    scenarioKey: null,
  });
  let seq = 0;
  for (const line of lines) {
    seq += 1;
    store.financeForecastLine.push({
      id: `fl-${seq}`,
      forecastVersionId: versionId,
      financialAccountId: line.financialAccountId,
      amountMinor: line.amountMinor,
    });
  }
}

function normalizedNameKey(name: string): string {
  return name.trim().toLowerCase();
}

function assertActiveNameUnique(store: ScenarioStore, row: { tenantId: string; financeYearId: string; name: string; archivedAt: Date | null; id?: string }) {
  if (row.archivedAt) return;
  const key = normalizedNameKey(row.name);
  const conflict = store.financeScenario.some(
    (s) =>
      s.archivedAt == null &&
      s.tenantId === row.tenantId &&
      s.financeYearId === row.financeYearId &&
      normalizedNameKey(s.name) === key &&
      s.id !== row.id,
  );
  if (conflict) {
    const error = Object.assign(new Error("Unique constraint"), { code: "P2002" });
    throw error;
  }
}

export function makeScenarioDb(store: ScenarioStore) {
  let scenarioSeq = 0;
  let baselineSeq = 0;
  let assumptionSeq = 0;

  const db = {
    financeYear: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeYear.find((y) => y.id === where.id) ?? null,
    },
    financeForecast: {
      findUnique: async ({
        where,
        select,
      }: {
        where:
          | { tenantId_financeYearId: { tenantId: string; financeYearId: string } }
          | { id: string };
        select?: {
          id?: boolean;
          currentVersionId?: boolean;
          tenantId?: boolean;
          financeYearId?: boolean;
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
        if (select) {
          return {
            id: forecast.id,
            currentVersionId: forecast.currentVersionId,
            tenantId: forecast.tenantId,
            financeYearId: forecast.financeYearId,
          };
        }
        return forecast;
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
          forecast?: { select: { id?: boolean; tenantId?: boolean; financeYearId?: boolean } };
        };
      }) => {
        const row = store.financeForecastVersion.find((v) => v.id === where.id);
        if (!row) return null;
        const forecast = store.financeForecast.find((f) => f.id === row.forecastId)!;
        return {
          ...row,
          forecastId: row.forecastId,
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
    },
    financeForecastLine: {
      findMany: async () => store.financeForecastLine,
    },
    financialAccount: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financialAccount.find((a) => a.id === where.id) ?? null,
      findMany: async ({
        where,
        select,
      }: {
        where: { id: { in: string[] } };
        select?: { id?: boolean; tenantId?: boolean; canonicalSemantic?: boolean };
      }) => {
        const rows = store.financialAccount.filter((a) => where.id.in.includes(a.id));
        if (select) {
          return rows.map((a) => ({
            id: a.id,
            tenantId: a.tenantId,
            canonicalSemantic: a.canonicalSemantic,
          }));
        }
        return rows;
      },
    },
    financeScenario: {
      findUnique: async ({
        where,
        include,
      }: {
        where: { id: string };
        include?: { baselineLines?: boolean; assumptions?: boolean };
      }) => {
        const row = store.financeScenario.find((s) => s.id === where.id);
        if (!row) return null;
        return {
          ...row,
          baselineLines: include?.baselineLines
            ? store.financeScenarioBaselineLine.filter((l) => l.scenarioId === row.id)
            : undefined,
          assumptions: include?.assumptions
            ? store.financeScenarioAssumption.filter((a) => a.scenarioId === row.id)
            : undefined,
        };
      },
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
        const row = await db.financeScenario.findUnique({ where });
        if (!row) throw new Error("not found");
        return row;
      },
      findMany: async ({
        where,
        select,
      }: {
        where: {
          tenantId: string;
          financeYearId: string;
          archivedAt?: null;
          NOT?: { id: string };
        };
        select?: { id?: boolean; name?: boolean };
      }) => {
        return store.financeScenario
          .filter((s) => {
            if (s.tenantId !== where.tenantId) return false;
            if (s.financeYearId !== where.financeYearId) return false;
            if (where.archivedAt === null && s.archivedAt != null) return false;
            if (where.NOT && s.id === where.NOT.id) return false;
            return true;
          })
          .map((s) => (select ? { id: s.id, name: s.name } : s));
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        scenarioSeq += 1;
        const now = new Date();
        const row = {
          id: `sc-${scenarioSeq}`,
          tenantId: data.tenantId as string,
          financeYearId: data.financeYearId as string,
          name: data.name as string,
          description: (data.description as string | null) ?? null,
          sourceForecastId: data.sourceForecastId as string,
          sourceForecastVersionId: data.sourceForecastVersionId as string,
          baselineAsOfDate: (data.baselineAsOfDate as Date | null) ?? null,
          baselineActualsThroughDate: (data.baselineActualsThroughDate as Date | null) ?? null,
          createdByUserId: (data.createdByUserId as string | null) ?? null,
          updatedByUserId: (data.updatedByUserId as string | null) ?? null,
          archivedAt: (data.archivedAt as Date | null) ?? null,
          createdAt: now,
          updatedAt: now,
        };
        assertActiveNameUnique(store, row);
        store.financeScenario.push(row);
        return { ...row };
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: {
          id: string;
          tenantId: string;
          updatedAt: Date;
          archivedAt?: null;
        };
        data: Record<string, unknown>;
      }) => {
        const row = store.financeScenario.find(
          (s) =>
            s.id === where.id &&
            s.tenantId === where.tenantId &&
            s.updatedAt.getTime() === where.updatedAt.getTime() &&
            (where.archivedAt === null ? s.archivedAt == null : true),
        );
        if (!row) return { count: 0 };
        if (data.name !== undefined) row.name = data.name as string;
        if (data.description !== undefined) row.description = data.description as string | null;
        if (data.archivedAt !== undefined) row.archivedAt = data.archivedAt as Date | null;
        row.updatedByUserId = (data.updatedByUserId as string | null) ?? row.updatedByUserId;
        row.updatedAt = new Date(row.updatedAt.getTime() + 5);
        if (data.name !== undefined || data.archivedAt !== undefined) {
          assertActiveNameUnique(store, row);
        }
        return { count: 1 };
      },
      deleteMany: async ({
        where,
      }: {
        where: { id: string; tenantId: string; updatedAt: Date };
      }) => {
        const idx = store.financeScenario.findIndex(
          (s) =>
            s.id === where.id &&
            s.tenantId === where.tenantId &&
            s.updatedAt.getTime() === where.updatedAt.getTime(),
        );
        if (idx < 0) return { count: 0 };
        const id = store.financeScenario[idx]!.id;
        store.financeScenario.splice(idx, 1);
        store.financeScenarioBaselineLine = store.financeScenarioBaselineLine.filter(
          (l) => l.scenarioId !== id,
        );
        store.financeScenarioAssumption = store.financeScenarioAssumption.filter(
          (a) => a.scenarioId !== id,
        );
        return { count: 1 };
      },
    },
    financeScenarioBaselineLine: {
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
        for (const item of data) {
          baselineSeq += 1;
          store.financeScenarioBaselineLine.push({
            id: `sbl-${baselineSeq}`,
            scenarioId: item.scenarioId as string,
            financialAccountId: item.financialAccountId as string,
            amountMinor: item.amountMinor as number,
          });
        }
        return { count: data.length };
      },
    },
    financeScenarioAssumption: {
      findUnique: async ({
        where,
      }: {
        where: { scenarioId_financialAccountId: { scenarioId: string; financialAccountId: string } };
      }) => {
        const row = store.financeScenarioAssumption.find(
          (a) =>
            a.scenarioId === where.scenarioId_financialAccountId.scenarioId &&
            a.financialAccountId === where.scenarioId_financialAccountId.financialAccountId,
        );
        return row ?? null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        assumptionSeq += 1;
        const row = {
          id: `sa-${assumptionSeq}`,
          scenarioId: data.scenarioId as string,
          financialAccountId: data.financialAccountId as string,
          kind: data.kind as string,
          percentBasisPoints: (data.percentBasisPoints as number | null) ?? null,
          amountMinorDelta: (data.amountMinorDelta as number | null) ?? null,
          absoluteAmountMinor: (data.absoluteAmountMinor as number | null) ?? null,
          note: (data.note as string | null) ?? null,
        };
        store.financeScenarioAssumption.push(row);
        return row;
      },
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
        for (const item of data) {
          await db.financeScenarioAssumption.create({ data: item });
        }
        return { count: data.length };
      },
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: {
          scenarioId_financialAccountId: { scenarioId: string; financialAccountId: string };
        };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        const existing = await db.financeScenarioAssumption.findUnique({ where });
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        return db.financeScenarioAssumption.create({ data: create });
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const idx = store.financeScenarioAssumption.findIndex((a) => a.id === where.id);
        if (idx >= 0) store.financeScenarioAssumption.splice(idx, 1);
        return store.financeScenarioAssumption[idx];
      },
    },
    $transaction: async <T>(fn: (tx: typeof db) => Promise<T>) => fn(db),
  };

  return db;
}
