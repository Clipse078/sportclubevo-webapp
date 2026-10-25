import { describe, expect, it } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  EXPECTED_FINANCIAL_EVENT_04E_04_ARCHITECTURE_LOCKS,
  FINANCE_FORECAST_TIMING_FIN_04E_04_QUERY,
} from "@/lib/finance/forecast/finance-forecast-timing-read-model";
import { buildForecastTimingIntelligence } from "@/lib/finance/forecast/build-forecast-timing-intelligence";
import {
  createExpectedEventStore,
  expectedEventCtx,
  makeExpectedEventDb,
  scenarioTenantB,
  scenarioYearId,
} from "@/lib/finance/__tests__/finance-04e-03-expected-event-mock-db";
import { seedCurrentForecast } from "@/lib/finance/__tests__/finance-04d-02-scenario-mock-db";
import {
  loadFinanceExpectedFinancialEventDetail,
  loadFinanceForecastTimingOverview,
} from "@/lib/finance/services/finance-forecast-timing-query-service";

const cutoff = "2026-06-30";

function seedActual(
  store: ReturnType<typeof createExpectedEventStore>,
  accountId: string,
  amountMinor: number,
) {
  store.financeActualEntry.push({
    id: `act-${accountId}`,
    tenantId: store.financeYear[0]!.tenantId,
    financeYearId: scenarioYearId,
    financialAccountId: accountId,
    effectiveDate: new Date("2026-05-01T00:00:00.000Z"),
    amountMinor,
  });
}

function seedEvent(
  store: ReturnType<typeof createExpectedEventStore>,
  input: {
    id: string;
    accountId: string;
    amountMinor: number;
    timingPrecision: "EXACT_DATE" | "MONTH" | "DATE_RANGE";
    expectedDateIso?: string;
    expectedMonthStartIso?: string;
    rangeStartDateIso?: string;
    rangeEndDateIso?: string;
    financeYearId?: string;
  },
) {
  const db = makeExpectedEventDb(store);
  const parseDate = db._helpers.parseDate;
  store.financeExpectedFinancialEvent.push({
    id: input.id,
    tenantId: store.financeYear[0]!.tenantId,
    financeYearId: input.financeYearId ?? scenarioYearId,
    financialAccountId: input.accountId,
    expectedAmountMinor: input.amountMinor,
    timingPrecision: input.timingPrecision,
    expectedDate: parseDate(input.expectedDateIso ?? null),
    expectedMonthStart: parseDate(input.expectedMonthStartIso ?? null),
    rangeStartDate: parseDate(input.rangeStartDateIso ?? null),
    rangeEndDate: parseDate(input.rangeEndDateIso ?? null),
    sourceKind: "MANUAL",
    sourceRefType: null,
    sourceRefId: null,
    description: null,
    createdByUserId: "user-1",
    updatedByUserId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("FIN-04E-04 architecture locks", () => {
  it("documents read-model invariants", () => {
    expect(EXPECTED_FINANCIAL_EVENT_04E_04_ARCHITECTURE_LOCKS.TIMING_READ_MODEL_IS_PRESENTATION_NEUTRAL).toBe(
      true,
    );
    expect(EXPECTED_FINANCIAL_EVENT_04E_04_ARCHITECTURE_LOCKS.READ_MODEL_DOES_NOT_IMPLEMENT_LIQUIDITY).toBe(
      true,
    );
    expect(FINANCE_FORECAST_TIMING_FIN_04E_04_QUERY.overviewQueryService).toBe(
      "loadFinanceForecastTimingOverview",
    );
  });
});

describe("FIN-04E-04 timing profiles", () => {
  it("empty event profile surfaces unscheduled remainder (not no data)", async () => {
    const store = createExpectedEventStore();
    seedActual(store, "acc-income", 20_000);
    const db = makeExpectedEventDb(store);
    const overview = await loadFinanceForecastTimingOverview(db as never, expectedEventCtx(), {
      financeYearId: scenarioYearId,
    });

    expect(overview.counts.totalExpectedEventCount).toBe(0);
    expect(overview.annual.income.remainingFutureExpectationMinor).toBe(80_000);
    expect(overview.annual.income.timedFutureExpectationMinor).toBe(0);
    expect(overview.annual.income.unscheduledRemainderMinor).toBe(80_000);
    expect(overview.interpretationState).toBe("PARTIALLY_SCHEDULED");
    expect(overview.accounts.some((a) => a.financialAccountId === "acc-income")).toBe(true);
  });

  it("partial profile: 50k timed of 80k remaining", async () => {
    const store = createExpectedEventStore();
    seedActual(store, "acc-income", 20_000);
    seedEvent(store, {
      id: "e1",
      accountId: "acc-income",
      amountMinor: 50_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-09-01",
    });
    const overview = await loadFinanceForecastTimingOverview(
      makeExpectedEventDb(store) as never,
      expectedEventCtx(),
      { financeYearId: scenarioYearId },
    );
    expect(overview.annual.income.unscheduledRemainderMinor).toBe(30_000);
    expect(overview.annual.income.timedFutureExpectationMinor).toBe(50_000);
  });

  it("balanced profile", async () => {
    const store = createExpectedEventStore();
    seedActual(store, "acc-income", 20_000);
    seedEvent(store, {
      id: "e1",
      accountId: "acc-income",
      amountMinor: 80_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-12-01",
    });
    const overview = await loadFinanceForecastTimingOverview(
      makeExpectedEventDb(store) as never,
      expectedEventCtx(),
      { financeYearId: scenarioYearId },
    );
    expect(overview.annual.income.unscheduledRemainderMinor).toBe(0);
    expect(overview.interpretationState).toBe("FULLY_SCHEDULED");
  });

  it("overallocated profile", async () => {
    const store = createExpectedEventStore();
    seedActual(store, "acc-income", 20_000);
    seedEvent(store, {
      id: "e1",
      accountId: "acc-income",
      amountMinor: 90_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-08-01",
    });
    const overview = await loadFinanceForecastTimingOverview(
      makeExpectedEventDb(store) as never,
      expectedEventCtx(),
      { financeYearId: scenarioYearId },
    );
    expect(overview.annual.income.overallocatedAmountMinor).toBe(10_000);
    expect(overview.interpretationState).toBe("OVERALLOCATED");
    expect(overview.timingCoverage.kind).toBe("RATIO");
    if (overview.timingCoverage.kind === "RATIO") {
      expect(overview.timingCoverage.timedCoverageBasisPoints).toBe(10_000);
      expect(overview.timingCoverage.rawTimedCoverageBasisPoints).toBeGreaterThan(10_000);
    }
  });

  it("ambiguous timing remains distinct", async () => {
    const store = createExpectedEventStore();
    seedActual(store, "acc-income", 20_000);
    seedEvent(store, {
      id: "e-amb",
      accountId: "acc-income",
      amountMinor: 15_000,
      timingPrecision: "DATE_RANGE",
      rangeStartDateIso: "2026-06-01",
      rangeEndDateIso: "2026-07-15",
    });
    const overview = await loadFinanceForecastTimingOverview(
      makeExpectedEventDb(store) as never,
      expectedEventCtx(),
      { financeYearId: scenarioYearId },
    );
    expect(overview.annual.income.ambiguousTimingExpectationMinor).toBe(15_000);
    expect(overview.annual.income.timedFutureExpectationMinor).toBe(0);
    expect(overview.interpretationState).toBe("ATTENTION_REQUIRED");
    expect(overview.exceptions.some((e) => e.kind === "AMBIGUOUS_AT_CUTOFF")).toBe(true);
  });
});

describe("FIN-04E-04 income and expense separation", () => {
  it("keeps income and expense timing totals distinct with net context", async () => {
    const store = createExpectedEventStore();
    seedCurrentForecast(
      store,
      [
        { financialAccountId: "acc-income", amountMinor: 100_000 },
        { financialAccountId: "acc-expense", amountMinor: 40_000 },
      ],
      "fv-v1",
      { versionNumber: 1 },
    );
    store.financeForecastVersion[0]!.actualsThroughDate = new Date(`${cutoff}T00:00:00.000Z`);
    seedActual(store, "acc-income", 10_000);
    seedActual(store, "acc-expense", 5_000);
    seedEvent(store, {
      id: "inc",
      accountId: "acc-income",
      amountMinor: 30_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-10-01",
    });
    seedEvent(store, {
      id: "exp",
      accountId: "acc-expense",
      amountMinor: 10_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-11-01",
    });

    const overview = await loadFinanceForecastTimingOverview(
      makeExpectedEventDb(store) as never,
      expectedEventCtx(),
      { financeYearId: scenarioYearId },
    );

    expect(overview.annual.income.timedFutureExpectationMinor).toBe(30_000);
    expect(overview.annual.expense.timedFutureExpectationMinor).toBe(10_000);
    expect(overview.annual.resultMinor).toBe(60_000);
    expect(overview.annual.futureResultContextMinor).toBe(55_000);
  });
});

describe("FIN-04E-04 account coverage and exceptions", () => {
  it("includes forecast accounts without events", async () => {
    const store = createExpectedEventStore();
    seedCurrentForecast(
      store,
      [
        { financialAccountId: "acc-income", amountMinor: 50_000 },
        { financialAccountId: "acc-expense", amountMinor: 20_000 },
      ],
      "fv-v1",
      { versionNumber: 1 },
    );
    store.financeForecastVersion[0]!.actualsThroughDate = new Date(`${cutoff}T00:00:00.000Z`);

    const overview = await loadFinanceForecastTimingOverview(
      makeExpectedEventDb(store) as never,
      expectedEventCtx(),
      { financeYearId: scenarioYearId },
    );
    const expense = overview.accounts.find((a) => a.financialAccountId === "acc-expense");
    expect(expense?.reconciliation.unscheduledRemainderMinor).toBe(20_000);
  });

  it("surfaces FORECAST_LINE_MISSING when events exist without forecast line", async () => {
    const store = createExpectedEventStore();
    seedCurrentForecast(store, [{ financialAccountId: "acc-income", amountMinor: 100_000 }], "fv-v1", {
      versionNumber: 1,
    });
    store.financeForecastVersion[0]!.actualsThroughDate = new Date(`${cutoff}T00:00:00.000Z`);
    seedEvent(store, {
      id: "orphan",
      accountId: "acc-expense",
      amountMinor: 5_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-08-01",
    });

    const overview = await loadFinanceForecastTimingOverview(
      makeExpectedEventDb(store) as never,
      expectedEventCtx(),
      { financeYearId: scenarioYearId },
    );
    expect(overview.exceptions.some((e) => e.kind === "FORECAST_LINE_MISSING")).toBe(true);
  });
});

describe("FIN-04E-04 cross-FY ownership", () => {
  it("includes FY-owned events with cross-year timing dates but excludes other-year ownership", async () => {
    const store = createExpectedEventStore();
    store.financeYear.push({ id: "fy-2028", tenantId: store.financeYear[0]!.tenantId });
    seedCurrentForecast(store, [{ financialAccountId: "acc-income", amountMinor: 100_000 }], "fv-v1", {
      versionNumber: 1,
    });
    store.financeForecastVersion[0]!.actualsThroughDate = new Date(`${cutoff}T00:00:00.000Z`);

    seedEvent(store, {
      id: "owned-here-timing-next-fy",
      accountId: "acc-income",
      amountMinor: 10_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2028-01-15",
      financeYearId: scenarioYearId,
    });
    seedEvent(store, {
      id: "other-fy-owner",
      accountId: "acc-income",
      amountMinor: 99_000,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-12-01",
      financeYearId: "fy-2028",
    });

    const overview = await loadFinanceForecastTimingOverview(
      makeExpectedEventDb(store) as never,
      expectedEventCtx(),
      { financeYearId: scenarioYearId },
    );
    expect(overview.counts.totalExpectedEventCount).toBe(1);
    expect(overview.upcomingEvents.some((e) => e.eventId === "owned-here-timing-next-fy")).toBe(true);
    expect(overview.upcomingEvents.some((e) => e.eventId === "other-fy-owner")).toBe(false);
  });
});

describe("FIN-04E-04 determinism", () => {
  it("returns stable account and upcoming ordering regardless of seed order", () => {
    const baseInput = {
      financeYearId: scenarioYearId,
      actualsThroughDateIso: cutoff,
      currentForecast: {
        kind: "AVAILABLE" as const,
        forecastId: "ff-1",
        forecastVersionId: "fv-1",
        versionNumber: 1,
        asOfDateIso: cutoff,
        actualsThroughDateIso: cutoff,
      },
      planningAccounts: [
        {
          id: "acc-b",
          name: "B",
          accountType: "EXPENSE" as const,
          lifecycle: "ACTIVE" as const,
        },
        {
          id: "acc-a",
          name: "A",
          accountType: "INCOME" as const,
          lifecycle: "ACTIVE" as const,
        },
      ],
      forecastAmountByAccountId: new Map([
        ["acc-a", 100_000],
        ["acc-b", 50_000],
      ]),
      actualThroughCutoffByAccountId: new Map([
        ["acc-a", 20_000],
        ["acc-b", 10_000],
      ]),
      events: [
        {
          id: "evt-2",
          tenantId: "t",
          financeYearId: scenarioYearId,
          financialAccountId: "acc-a",
          expectedAmountMinor: 40_000,
          timingPrecision: "EXACT_DATE" as const,
          expectedDateIso: "2026-09-01",
          expectedMonthStartIso: null,
          rangeStartDateIso: null,
          rangeEndDateIso: null,
          sourceKind: "MANUAL" as const,
          sourceRefType: null,
          sourceRefId: null,
          description: null,
          createdByUserId: null,
          updatedByUserId: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "evt-1",
          tenantId: "t",
          financeYearId: scenarioYearId,
          financialAccountId: "acc-a",
          expectedAmountMinor: 30_000,
          timingPrecision: "EXACT_DATE" as const,
          expectedDateIso: "2026-08-01",
          expectedMonthStartIso: null,
          rangeStartDateIso: null,
          rangeEndDateIso: null,
          sourceKind: "MANUAL" as const,
          sourceRefType: null,
          sourceRefId: null,
          description: null,
          createdByUserId: null,
          updatedByUserId: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };

    const forward = buildForecastTimingIntelligence(baseInput);
    const reversed = buildForecastTimingIntelligence({
      ...baseInput,
      events: [...baseInput.events].reverse(),
      planningAccounts: [...baseInput.planningAccounts].reverse(),
    });

    expect(forward.accounts.map((a) => a.financialAccountId)).toEqual(
      reversed.accounts.map((a) => a.financialAccountId),
    );
    expect(forward.upcomingEvents.map((e) => e.eventId)).toEqual(["evt-1", "evt-2"]);
  });
});

describe("FIN-04E-04 permissions and tenant isolation", () => {
  it("requires finance.forecast.view", async () => {
    const store = createExpectedEventStore();
    const db = makeExpectedEventDb(store);
    await expect(
      loadFinanceForecastTimingOverview(db as never, expectedEventCtx({ permissionKeys: new Set() }), {
        financeYearId: scenarioYearId,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
  });

  it("rejects cross-tenant finance year", async () => {
    const store = createExpectedEventStore();
    store.financeYear.push({ id: "fy-other", tenantId: scenarioTenantB });
    const db = makeExpectedEventDb(store);
    await expect(
      loadFinanceForecastTimingOverview(db as never, expectedEventCtx(), {
        financeYearId: "fy-other",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });
  });

  it("isolates event detail by tenant", async () => {
    const store = createExpectedEventStore();
    seedEvent(store, {
      id: "secret",
      accountId: "acc-other-tenant",
      amountMinor: 1,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-08-01",
    });
    store.financeExpectedFinancialEvent[0]!.tenantId = scenarioTenantB;
    const db = makeExpectedEventDb(store);
    await expect(
      loadFinanceExpectedFinancialEventDetail(db as never, expectedEventCtx(), {
        eventId: "secret",
        actualsThroughDateIso: cutoff,
      }),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });
});

describe("FIN-04E-04 zero remaining expectation", () => {
  it("reports NO_REMAINING_EXPECTATION when actual equals annual forecast", async () => {
    const store = createExpectedEventStore();
    seedActual(store, "acc-income", 100_000);
    const overview = await loadFinanceForecastTimingOverview(
      makeExpectedEventDb(store) as never,
      expectedEventCtx(),
      { financeYearId: scenarioYearId },
    );
    expect(overview.interpretationState).toBe("NO_REMAINING_EXPECTATION");
    expect(overview.timingCoverage.kind).toBe("NO_REMAINING_EXPECTATION");
  });
});
