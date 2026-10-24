import { describe, expect, it } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  EXPECTED_FINANCIAL_EVENT_04E_03_ARCHITECTURE_LOCKS,
  EXPECTED_FINANCIAL_EVENT_CAPABILITY_KEY,
  EXPECTED_FINANCIAL_EVENT_PERMISSIONS,
} from "@/lib/finance/forecast/expected-financial-event-architecture-contract";
import {
  createFinanceExpectedFinancialEvent,
  deleteFinanceExpectedFinancialEvent,
  getFinanceExpectedFinancialEvent,
  listFinanceExpectedFinancialEvents,
  updateFinanceExpectedFinancialEvent,
} from "@/lib/finance/services/finance-expected-financial-event-service";
import { loadExpectedFinancialTimingReconciliation } from "@/lib/finance/services/finance-expected-financial-timing-reconciliation-service";
import {
  createExpectedEventStore,
  expectedEventCtx,
  makeExpectedEventDb,
  scenarioTenantB,
  scenarioYearId,
} from "@/lib/finance/__tests__/finance-04e-03-expected-event-mock-db";

describe("FIN-04E-03 architecture locks", () => {
  it("documents service-layer invariants", () => {
    expect(EXPECTED_FINANCIAL_EVENT_04E_03_ARCHITECTURE_LOCKS.MANUAL_EVENT_CRUD_DOES_NOT_MUTATE_FORECAST).toBe(
      true,
    );
    expect(EXPECTED_FINANCIAL_EVENT_CAPABILITY_KEY).toBe("FORECASTING");
    expect(EXPECTED_FINANCIAL_EVENT_PERMISSIONS.view).toBe("finance.forecast.view");
    expect(EXPECTED_FINANCIAL_EVENT_PERMISSIONS.manage).toBe("finance.forecast.manage");
  });
});

describe("FIN-04E-03 create", () => {
  it("creates manual events for exact date, month, and range", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    const ctx = expectedEventCtx();

    const exact = await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 10_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2028-01-15",
    });
    expect(exact.timingPrecision).toBe("EXACT_DATE");
    expect(exact.sourceKind).toBe("MANUAL");
    expect(exact.createdByUserId).toBe("user-1");

    const month = await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-expense",
      expectedAmountMinor: 5_000,
      timingPrecision: "MONTH",
      expectedMonthStartIso: "2026-09-01",
    });
    expect(month.timingPrecision).toBe("MONTH");

    const range = await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 2_000,
      timingPrecision: "DATE_RANGE",
      rangeStartDateIso: "2026-07-01",
      rangeEndDateIso: "2026-07-31",
    });
    expect(range.timingPrecision).toBe("DATE_RANGE");
  });

  it("rejects invalid tenant year, cross-tenant account, archived account, invalid amount/timing", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    const ctx = expectedEventCtx();

    store.financeYear.push({ id: "fy-other", tenantId: scenarioTenantB });

    await expect(
      createFinanceExpectedFinancialEvent(db as never, ctx, {
        financeYearId: "fy-other",
        financialAccountId: "acc-income",
        expectedAmountMinor: 1,
        timingPrecision: "EXACT_DATE",
        expectedDateIso: "2026-01-01",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });

    await expect(
      createFinanceExpectedFinancialEvent(db as never, ctx, {
        financeYearId: scenarioYearId,
        financialAccountId: "acc-other-tenant",
        expectedAmountMinor: 1,
        timingPrecision: "EXACT_DATE",
        expectedDateIso: "2026-01-01",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });

    await expect(
      createFinanceExpectedFinancialEvent(db as never, ctx, {
        financeYearId: scenarioYearId,
        financialAccountId: "acc-archived",
        expectedAmountMinor: 1,
        timingPrecision: "EXACT_DATE",
        expectedDateIso: "2026-01-01",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_ARCHIVED_ACCOUNT" });

    await expect(
      createFinanceExpectedFinancialEvent(db as never, ctx, {
        financeYearId: scenarioYearId,
        financialAccountId: "acc-income",
        expectedAmountMinor: 0,
        timingPrecision: "EXACT_DATE",
        expectedDateIso: "2026-01-01",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_EXPECTED_EVENT_INVALID_AMOUNT" });

    await expect(
      createFinanceExpectedFinancialEvent(db as never, ctx, {
        financeYearId: scenarioYearId,
        financialAccountId: "acc-income",
        expectedAmountMinor: 1,
        timingPrecision: "MONTH",
        expectedMonthStartIso: "2026-06-15",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_EXPECTED_EVENT_INVALID_TIMING" });
  });

  it("requires forecast manage permission", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    await expect(
      createFinanceExpectedFinancialEvent(
        db as never,
        expectedEventCtx({ permissionKeys: new Set(["finance.forecast.view"]) }),
        {
          financeYearId: scenarioYearId,
          financialAccountId: "acc-income",
          expectedAmountMinor: 1,
          timingPrecision: "EXACT_DATE",
          expectedDateIso: "2026-01-01",
        },
      ),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
  });
});

describe("FIN-04E-03 update", () => {
  it("updates amount, timing precision, description without touching forecast", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    const ctx = expectedEventCtx();
    const forecastLinesBefore = store.financeForecastLine.map((l) => ({ ...l }));

    const created = await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 20_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-08-01",
    });

    const updated = await updateFinanceExpectedFinancialEvent(db as never, ctx, created.id, {
      expectedAmountMinor: 25_000,
      timingPrecision: "MONTH",
      expectedMonthStartIso: "2026-09-01",
      description: "Grant window",
      expectedUpdatedAt: created.updatedAt,
    });
    expect(updated.expectedAmountMinor).toBe(25_000);
    expect(updated.timingPrecision).toBe("MONTH");
    expect(updated.description).toBe("Grant window");
    expect(store.financeForecastLine).toEqual(forecastLinesBefore);
    expect(store.financeForecast[0]!.currentVersionId).toBe("fv-v1");
  });

  it("rejects stale token, cross-tenant access, and source-linked mutation", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    const ctx = expectedEventCtx();
    const created = await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 1_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-08-01",
    });

    store.financeExpectedFinancialEvent[0]!.sourceRefType = "COMMITMENT";
    store.financeExpectedFinancialEvent[0]!.sourceRefId = "c-1";

    await expect(
      updateFinanceExpectedFinancialEvent(db as never, ctx, created.id, {
        expectedAmountMinor: 2_000,
        expectedUpdatedAt: created.updatedAt,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_EXPECTED_EVENT_SOURCE_MUTATION_FORBIDDEN" });

    store.financeExpectedFinancialEvent[0]!.sourceRefType = null;
    store.financeExpectedFinancialEvent[0]!.sourceRefId = null;

    await expect(
      updateFinanceExpectedFinancialEvent(db as never, expectedEventCtx({ tenantId: scenarioTenantB }), created.id, {
        expectedAmountMinor: 2_000,
        expectedUpdatedAt: created.updatedAt,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });

    store.financeExpectedFinancialEvent[0]!.updatedAt = new Date("2026-01-02T00:00:00.000Z");
    await expect(
      updateFinanceExpectedFinancialEvent(db as never, ctx, created.id, {
        expectedAmountMinor: 2_000,
        expectedUpdatedAt: created.updatedAt,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_EXPECTED_EVENT_STALE" });
  });
});

describe("FIN-04E-03 delete", () => {
  it("deletes manual event and increases derived unscheduled remainder without forecast/actual mutation", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    const ctx = expectedEventCtx();

    store.financeActualEntry.push({
      id: "act-1",
      tenantId: ctx.tenantId,
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      effectiveDate: new Date("2026-05-01T00:00:00.000Z"),
      amountMinor: 30_000,
    });

    const created = await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 40_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-09-01",
    });

    const before = await loadExpectedFinancialTimingReconciliation(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
    });
    expect(before.unscheduledRemainderMinor).toBe(30_000);

    const forecastBefore = store.financeForecastLine.length;
    const actualBefore = store.financeActualEntry.length;

    await deleteFinanceExpectedFinancialEvent(
      db as never,
      ctx,
      created.id,
      created.updatedAt,
    );

    const after = await loadExpectedFinancialTimingReconciliation(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
    });
    expect(after.unscheduledRemainderMinor).toBe(70_000);
    expect(store.financeExpectedFinancialEvent).toHaveLength(0);
    expect(store.financeForecastLine).toHaveLength(forecastBefore);
    expect(store.financeActualEntry).toHaveLength(actualBefore);
  });

  it("rejects delete without manage permission", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    const ctx = expectedEventCtx();
    const created = await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 1_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-09-01",
    });

    await expect(
      deleteFinanceExpectedFinancialEvent(
        db as never,
        expectedEventCtx({ permissionKeys: new Set(["finance.forecast.view"]) }),
        created.id,
        created.updatedAt,
      ),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
  });
});

describe("FIN-04E-03 list and read", () => {
  it("lists events in deterministic timing order", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    const ctx = expectedEventCtx();

    await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 1,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-10-01",
    });
    await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 1,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-08-01",
    });

    const listed = await listFinanceExpectedFinancialEvents(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
    });
    expect(listed).toHaveLength(2);
    expect(listed[0]!.expectedDateIso).toBe("2026-08-01");

    const one = await getFinanceExpectedFinancialEvent(db as never, ctx, listed[0]!.id);
    expect(one.id).toBe(listed[0]!.id);
    expect(one).not.toHaveProperty("tenant");
  });
});

describe("FIN-04E-03 reconciliation application service", () => {
  it("resolves forecast by currentVersionId pointer and actual through cutoff", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    const ctx = expectedEventCtx();

    store.financeActualEntry.push({
      id: "act-1",
      tenantId: ctx.tenantId,
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      effectiveDate: new Date("2026-06-01T00:00:00.000Z"),
      amountMinor: 30_000,
    });

    await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 70_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-09-01",
    });

    const balanced = await loadExpectedFinancialTimingReconciliation(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
    });
    expect(balanced.currentForecastVersionId).toBe("fv-v1");
    expect(balanced.annualForecastAmountMinor).toBe(100_000);
    expect(balanced.actualThroughCutoffMinor).toBe(30_000);
    expect(balanced.actualsThroughDateIso).toBe("2026-06-30");
    expect(balanced.state).toBe("BALANCED");

    store.financeForecast[0]!.currentVersionId = "fv-v2";
    store.financeForecastVersion.push({
      id: "fv-v2",
      forecastId: "ff-1",
      status: "CURRENT",
      versionNumber: 2,
      actualsThroughDate: new Date("2026-06-30T00:00:00.000Z"),
    });
    store.financeForecastLine.push({
      id: "fl-v2",
      forecastVersionId: "fv-v2",
      financialAccountId: "acc-income",
      amountMinor: 200_000,
    });

    const fromPointer = await loadExpectedFinancialTimingReconciliation(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
    });
    expect(fromPointer.annualForecastAmountMinor).toBe(200_000);
    expect(fromPointer.currentForecastVersionId).toBe("fv-v2");
  });

  it("surfaces unscheduled, overallocated, ambiguous, actual>forecast, missing line", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    const ctx = expectedEventCtx();

    const unscheduled = await loadExpectedFinancialTimingReconciliation(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
    });
    expect(unscheduled.state).toBe("UNSCHEDULED_REMAINDER");
    expect(unscheduled.unscheduledRemainderMinor).toBe(100_000);

    await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 120_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-12-01",
    });
    const over = await loadExpectedFinancialTimingReconciliation(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
    });
    expect(over.state).toBe("OVERALLOCATED");

    await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 10_000,
      timingPrecision: "MONTH",
      expectedMonthStartIso: "2026-06-01",
    });
    const ambiguous = await loadExpectedFinancialTimingReconciliation(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
    });
    expect(ambiguous.ambiguousTimingExpectationMinor).toBeGreaterThan(0);

    store.financeActualEntry.push({
      id: "act-over",
      tenantId: ctx.tenantId,
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      effectiveDate: new Date("2026-05-01T00:00:00.000Z"),
      amountMinor: 110_000,
    });
    const actualExceeds = await loadExpectedFinancialTimingReconciliation(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
    });
    expect(actualExceeds.remainingFutureExpectationMinor).toBe(0);
    expect(actualExceeds.actualExceedsAnnualForecastAmountMinor).toBe(10_000);

    const missingLine = await loadExpectedFinancialTimingReconciliation(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-expense",
    });
    expect(missingLine.state).toBe("FORECAST_LINE_ABSENT");
    expect(missingLine.annualForecastAmountMinor).toBeNull();
  });

  it("rejects mismatched explicit cutoff", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    const ctx = expectedEventCtx();
    await expect(
      loadExpectedFinancialTimingReconciliation(db as never, ctx, {
        financeYearId: scenarioYearId,
        financialAccountId: "acc-income",
        actualsThroughDateIso: "2026-01-01",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_EXPECTED_EVENT_INVALID_CUTOFF" });
  });
});

describe("FIN-04E-03 source identity", () => {
  it("allows manual events without source refs and enforces tenant-scoped uniqueness", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    const ctx = expectedEventCtx();

    await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 1,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-01-01",
    });
    await createFinanceExpectedFinancialEvent(db as never, ctx, {
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 2,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-02-01",
    });

    store.financeExpectedFinancialEvent.push({
      id: "src-1",
      tenantId: ctx.tenantId,
      financeYearId: scenarioYearId,
      financialAccountId: "acc-income",
      expectedAmountMinor: 1,
      timingPrecision: "EXACT_DATE",
      expectedDate: new Date("2026-03-01T00:00:00.000Z"),
      expectedMonthStart: null,
      rangeStartDate: null,
      rangeEndDate: null,
      sourceKind: "MANUAL",
      sourceRefType: "FUTURE",
      sourceRefId: "x-1",
      description: null,
      createdByUserId: null,
      updatedByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    store.financeExpectedFinancialEvent.push({
      id: "src-2",
      tenantId: scenarioTenantB,
      financeYearId: scenarioYearId,
      financialAccountId: "acc-other-tenant",
      expectedAmountMinor: 1,
      timingPrecision: "EXACT_DATE",
      expectedDate: new Date("2026-03-01T00:00:00.000Z"),
      expectedMonthStart: null,
      rangeStartDate: null,
      rangeEndDate: null,
      sourceKind: "MANUAL",
      sourceRefType: "FUTURE",
      sourceRefId: "x-1",
      description: null,
      createdByUserId: null,
      updatedByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      db.financeExpectedFinancialEvent.create({
        data: {
          tenantId: ctx.tenantId,
          financeYearId: scenarioYearId,
          financialAccountId: "acc-income",
          expectedAmountMinor: 1,
          timingPrecision: "EXACT_DATE",
          expectedDate: new Date("2026-04-01T00:00:00.000Z"),
          expectedMonthStart: null,
          rangeStartDate: null,
          rangeEndDate: null,
          sourceKind: "MANUAL",
          sourceRefType: "FUTURE",
          sourceRefId: "x-1",
          description: null,
          createdByUserId: null,
          updatedByUserId: null,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
