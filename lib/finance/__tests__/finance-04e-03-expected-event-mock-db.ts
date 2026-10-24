import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  createEmptyScenarioStore,
  makeScenarioDb,
  seedCurrentForecast,
  scenarioTenantA,
  scenarioTenantB,
  scenarioYearId,
} from "@/lib/finance/__tests__/finance-04d-02-scenario-mock-db";

export { scenarioTenantA, scenarioTenantB, scenarioYearId };

export function expectedEventCtx(
  overrides?: Partial<FinanceAuthContext>,
): FinanceAuthContext {
  return {
    tenantId: scenarioTenantA,
    userId: "user-1",
    permissionKeys: new Set(["finance.forecast.view", "finance.forecast.manage"]),
    ...overrides,
  };
}

export type ExpectedEventStore = ReturnType<typeof createExpectedEventStore>;

export function createExpectedEventStore() {
  const base = createEmptyScenarioStore();
  seedCurrentForecast(base, [{ financialAccountId: "acc-income", amountMinor: 100_000 }], "fv-v1", {
    versionNumber: 1,
  });
  base.financeForecastVersion[0]!.actualsThroughDate = new Date("2026-06-30T00:00:00.000Z");

  return {
    ...base,
    financeActualEntry: [] as Array<{
      id: string;
      tenantId: string;
      financeYearId: string;
      financialAccountId: string;
      effectiveDate: Date;
      amountMinor: number;
    }>,
    financeExpectedFinancialEvent: [] as Array<{
      id: string;
      tenantId: string;
      financeYearId: string;
      financialAccountId: string;
      expectedAmountMinor: number;
      timingPrecision: "EXACT_DATE" | "MONTH" | "DATE_RANGE";
      expectedDate: Date | null;
      expectedMonthStart: Date | null;
      rangeStartDate: Date | null;
      rangeEndDate: Date | null;
      sourceKind: "MANUAL";
      sourceRefType: string | null;
      sourceRefId: string | null;
      description: string | null;
      createdByUserId: string | null;
      updatedByUserId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
  };
}

export function makeExpectedEventDb(store: ExpectedEventStore) {
  const scenarioDb = makeScenarioDb(store);
  let eventSeq = 0;

  const parseDate = (iso: string | null | undefined): Date | null =>
    iso ? new Date(`${iso}T00:00:00.000Z`) : null;

  const db = {
    ...scenarioDb,
    financeActualEntry: {
      findMany: async ({
        where,
        select,
      }: {
        where: {
          tenantId: string;
          financeYearId: string;
          financialAccountId?: string;
        };
        select?: { effectiveDate?: boolean; amountMinor?: boolean; financialAccountId?: boolean };
      }) => {
        void select;
        return store.financeActualEntry.filter(
          (row) =>
            row.tenantId === where.tenantId &&
            row.financeYearId === where.financeYearId &&
            (where.financialAccountId == null ||
              row.financialAccountId === where.financialAccountId),
        );
      },
    },
    financeExpectedFinancialEvent: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeExpectedFinancialEvent.find((e) => e.id === where.id) ?? null,
      findMany: async ({
        where,
      }: {
        where: {
          tenantId: string;
          financeYearId?: string;
          financialAccountId?: string;
        };
      }) =>
        store.financeExpectedFinancialEvent.filter(
          (e) =>
            e.tenantId === where.tenantId &&
            (where.financeYearId == null || e.financeYearId === where.financeYearId) &&
            (where.financialAccountId == null ||
              e.financialAccountId === where.financialAccountId),
        ),
      create: async ({
        data,
      }: {
        data: Omit<
          (typeof store.financeExpectedFinancialEvent)[number],
          "id" | "createdAt" | "updatedAt"
        >;
      }) => {
        if (data.sourceRefType && data.sourceRefId) {
          const dup = store.financeExpectedFinancialEvent.some(
            (e) =>
              e.tenantId === data.tenantId &&
              e.sourceKind === data.sourceKind &&
              e.sourceRefType === data.sourceRefType &&
              e.sourceRefId === data.sourceRefId,
          );
          if (dup) {
            throw Object.assign(new Error("Unique constraint"), { code: "P2002" });
          }
        }
        eventSeq += 1;
        const now = new Date();
        const row = {
          id: `efe-${eventSeq}`,
          ...data,
          createdAt: now,
          updatedAt: now,
        };
        store.financeExpectedFinancialEvent.push(row);
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; tenantId: string; updatedAt: Date };
        data: Partial<(typeof store.financeExpectedFinancialEvent)[number]>;
      }) => {
        const row = store.financeExpectedFinancialEvent.find(
          (e) => e.id === where.id && e.tenantId === where.tenantId,
        );
        if (!row || row.updatedAt.getTime() !== where.updatedAt.getTime()) {
          return { count: 0 };
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return { count: 1 };
      },
      deleteMany: async ({
        where,
      }: {
        where: { id: string; tenantId: string; updatedAt: Date };
      }) => {
        const idx = store.financeExpectedFinancialEvent.findIndex(
          (e) =>
            e.id === where.id &&
            e.tenantId === where.tenantId &&
            e.updatedAt.getTime() === where.updatedAt.getTime(),
        );
        if (idx < 0) return { count: 0 };
        store.financeExpectedFinancialEvent.splice(idx, 1);
        return { count: 1 };
      },
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
        const row = store.financeExpectedFinancialEvent.find((e) => e.id === where.id);
        if (!row) throw new Error("Not found");
        return row;
      },
    },
    _helpers: {
      parseDate,
    },
    $transaction: async <T>(fn: (tx: typeof db) => Promise<T>) => fn(db),
  };

  return db;
}
