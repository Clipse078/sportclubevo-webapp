import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  enumerateFinanceYearMonths,
  enumerateFinanceYearQuarters,
  formatMeasurementPeriodLabel,
  isEffectiveDateWithinMeasurementPeriod,
  normalizeFinanceYearPeriodRange,
  resolveFinanceMeasurementPeriod,
} from "@/lib/finance/actual/finance-measurement-period";
import {
  parseFinanceMeasurementPeriodFromSearchParams,
  writeFinanceMeasurementPeriodToSearchParams,
} from "@/lib/finance/actual/finance-measurement-period-url";
import { resolveNextMonthRangeSelection } from "@/lib/finance/actual/finance-measurement-period-slicer";
import { loadActualsWorkspaceSnapshot } from "@/lib/finance/services/finance-actual-query-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceActualsWorkspacePanel.tsx"),
  "utf8",
);
const slicer = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceMeasurementPeriodSlicer.tsx"),
  "utf8",
);
const actualsPage = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/actuals/page.tsx"),
  "utf8",
);

const calendarYear = {
  startDate: new Date("2026-01-01T00:00:00.000Z"),
  endDate: new Date("2026-12-31T00:00:00.000Z"),
};

const julyYear = {
  startDate: new Date("2026-07-01T00:00:00.000Z"),
  endDate: new Date("2027-06-30T00:00:00.000Z"),
};

function ctx(): FinanceAuthContext {
  return {
    tenantId: "tenant-a",
    userId: "user-1",
    permissionKeys: new Set([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_ACTUAL_VIEW,
    ]),
  };
}

describe("FIN-03B-R1 period resolution", () => {
  it("1 calendar FY month list Jan–Dec", () => {
    const months = enumerateFinanceYearMonths(calendarYear);
    expect(months).toHaveLength(12);
    expect(months[0]!.index).toBe(0);
    expect(months[11]!.index).toBe(11);
  });

  it("2 July–June FY month list Jul–Jun", () => {
    const months = enumerateFinanceYearMonths(julyYear);
    expect(months).toHaveLength(12);
    expect(months[0]!.startDate.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(months[11]!.startDate.toISOString()).toBe("2027-06-01T00:00:00.000Z");
  });

  it("3 single month resolution", () => {
    const period = resolveFinanceMeasurementPeriod({
      financeYearId: "y1",
      financeYearName: "FY 2026",
      year: calendarYear,
      mode: "MONTH",
      requestedPeriodStartIndex: 0,
      requestedPeriodEndIndex: 0,
      locale: "de-CH",
    });
    expect(period.periodStartIndex).toBe(0);
    expect(period.periodEndIndex).toBe(0);
    expect(period.displayLabel).toMatch(/2026/);
  });

  it("4 contiguous Sep–Oct range", () => {
    const period = resolveFinanceMeasurementPeriod({
      financeYearId: "y1",
      financeYearName: "FY 2026",
      year: calendarYear,
      mode: "MONTH",
      requestedPeriodStartIndex: 8,
      requestedPeriodEndIndex: 9,
      locale: "de-CH",
    });
    expect(period.startDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(period.endDate.toISOString()).toBe("2026-10-31T00:00:00.000Z");
    expect(period.displayLabel).toMatch(/Sep/i);
    expect(period.displayLabel).toMatch(/Okt/i);
  });

  it("5 cross-calendar-year Nov–Feb inside July–June FY", () => {
    const period = resolveFinanceMeasurementPeriod({
      financeYearId: "y1",
      financeYearName: "Geschäftsjahr 2026/2027",
      year: julyYear,
      mode: "MONTH",
      requestedPeriodStartIndex: 4,
      requestedPeriodEndIndex: 7,
      locale: "de-CH",
    });
    expect(period.startDate.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(period.endDate.toISOString()).toBe("2027-02-28T00:00:00.000Z");
    expect(period.displayLabel).toMatch(/2026/);
    expect(period.displayLabel).toMatch(/2027/);
  });

  it("6 invalid inverted range is normalized", () => {
    const normalized = normalizeFinanceYearPeriodRange({
      requestedStartIndex: 9,
      requestedEndIndex: 6,
      monthCount: 12,
    });
    expect(normalized).toEqual({ startIndex: 6, endIndex: 9 });
  });

  it("7 quarter Q1 FY-relative calendar year", () => {
    const quarters = enumerateFinanceYearQuarters(calendarYear);
    expect(quarters[0]!.startDate.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(quarters[0]!.endDate.toISOString()).toBe("2026-03-31T00:00:00.000Z");
  });

  it("8 quarter Q4 FY-relative calendar year", () => {
    const quarters = enumerateFinanceYearQuarters(calendarYear);
    expect(quarters[3]!.startDate.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(quarters[3]!.endDate.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });

  it("9 July–June FY Q1 = Jul–Sep", () => {
    const quarters = enumerateFinanceYearQuarters(julyYear);
    expect(quarters[0]!.startDate.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(quarters[0]!.endDate.toISOString()).toBe("2026-09-30T00:00:00.000Z");
  });

  it("10 July–June FY Q3 = Jan–Mar", () => {
    const quarters = enumerateFinanceYearQuarters(julyYear);
    expect(quarters[2]!.startDate.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(quarters[2]!.endDate.toISOString()).toBe("2027-03-31T00:00:00.000Z");
    const period = resolveFinanceMeasurementPeriod({
      financeYearId: "y1",
      financeYearName: "Geschäftsjahr 2026/2027",
      year: julyYear,
      mode: "QUARTER",
      requestedPeriodStartIndex: 2,
      locale: "de-CH",
    });
    expect(period.displayLabel).toMatch(/^Q3 2027$/);
  });
});

describe("FIN-03B-R1 aggregation & URL", () => {
  it("11–13 Sep–Oct period filter and YTD through Oct", async () => {
    const store = {
      financeYear: [
        {
          id: "year-1",
          tenantId: "tenant-a",
          name: "FY 2026",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-12-31T00:00:00.000Z"),
          status: "OPEN",
        },
      ],
      financeConfiguration: [
        {
          tenantId: "tenant-a",
          baseCurrency: "CHF",
          currentFinanceYearId: "year-1",
        },
      ],
      financialAccount: [
        {
          id: "acc-1",
          tenantId: "tenant-a",
          name: "Membership",
          canonicalSemantic: "INCOME",
          lifecycle: "ACTIVE",
          reportingGroupId: "g1",
          sortOrder: 0,
        },
      ],
      financialReportingGroup: [],
      financeActualEntry: [
        {
          id: "e1",
          tenantId: "tenant-a",
          financeYearId: "year-1",
          financialAccountId: "acc-1",
          effectiveDate: new Date("2026-09-05T00:00:00.000Z"),
          amountMinor: 1000,
          currency: "CHF",
          description: null,
          source: "MANUAL",
          createdByUserId: null,
          updatedByUserId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          financialAccount: {
            id: "acc-1",
            name: "Membership",
            canonicalSemantic: "INCOME",
            lifecycle: "ACTIVE",
          },
        },
        {
          id: "e2",
          tenantId: "tenant-a",
          financeYearId: "year-1",
          financialAccountId: "acc-1",
          effectiveDate: new Date("2026-10-05T00:00:00.000Z"),
          amountMinor: 2000,
          currency: "CHF",
          description: null,
          source: "MANUAL",
          createdByUserId: null,
          updatedByUserId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          financialAccount: {
            id: "acc-1",
            name: "Membership",
            canonicalSemantic: "INCOME",
            lifecycle: "ACTIVE",
          },
        },
        {
          id: "e3",
          tenantId: "tenant-a",
          financeYearId: "year-1",
          financialAccountId: "acc-1",
          effectiveDate: new Date("2026-11-05T00:00:00.000Z"),
          amountMinor: 4000,
          currency: "CHF",
          description: null,
          source: "MANUAL",
          createdByUserId: null,
          updatedByUserId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          financialAccount: {
            id: "acc-1",
            name: "Membership",
            canonicalSemantic: "INCOME",
            lifecycle: "ACTIVE",
          },
        },
      ],
      financeBudget: [],
    };

    const db = {
      financeYear: { findMany: async () => store.financeYear },
      financeConfiguration: { findUnique: async () => store.financeConfiguration[0] },
      financeActualEntry: { findMany: async () => store.financeActualEntry },
      financeBudget: { findUnique: async () => null },
      financialAccount: { findMany: async () => store.financialAccount },
      financialReportingGroup: { findMany: async () => [] },
    };

    const { snapshot } = await loadActualsWorkspaceSnapshot(db as never, ctx(), {
      requestedYearId: "year-1",
      measurementMode: "MONTH",
      requestedPeriodStartIndex: 8,
      requestedPeriodEndIndex: 9,
    });

    expect(snapshot.entries.map((e) => e.id).sort()).toEqual(["e1", "e2"]);
    expect(snapshot.periodic?.periodSummary.incomeMinor).toBe(3000);
    expect(snapshot.periodic?.ytdSummary.incomeMinor).toBe(3000);
  });

  it("14 full-year semantics unchanged", async () => {
    const period = resolveFinanceMeasurementPeriod({
      financeYearId: "y1",
      financeYearName: "FY 2026",
      year: calendarYear,
      mode: "FULL_YEAR",
    });
    expect(period.startDate).toEqual(calendarYear.startDate);
    expect(period.displayLabel).toBe("FY 2026");
  });

  it("15–18 URL roundtrip and legacy periodIndex", () => {
    const params = new URLSearchParams();
    writeFinanceMeasurementPeriodToSearchParams(params, "MONTH", {
      periodStartIndex: 8,
      periodEndIndex: 9,
    });
    expect(params.get("periodStart")).toBe("8");
    expect(params.get("periodEnd")).toBe("9");
    expect(params.get("periodIndex")).toBeNull();

    const parsed = parseFinanceMeasurementPeriodFromSearchParams({
      periodStart: params.get("periodStart") ?? undefined,
      periodEnd: params.get("periodEnd") ?? undefined,
    });
    expect(parsed).toEqual({ periodStartIndex: 8, periodEndIndex: 9 });

    const legacy = parseFinanceMeasurementPeriodFromSearchParams({ periodIndex: "9" });
    expect(legacy).toEqual({ periodStartIndex: 9, periodEndIndex: 9 });
  });
});

describe("FIN-03B-R1 UX contracts", () => {
  it("19–22 slicer wiring and single create CTA", () => {
    expect(panel).toContain("data-finance-actual-create");
    expect(panel.match(/data-finance-actual-create/g)?.length).toBe(1);
    expect(panel).toContain("FinanceMonthPeriodSlicer");
    expect(panel).toContain("FinanceQuarterPeriodSlicer");
    expect(slicer).toContain("data-finance-month-slicer");
    expect(slicer).toContain("data-finance-quarter-slicer");
    expect(panel).not.toContain("previousPeriod");
  });

  it("23–27 headings, empty states, no period variance", () => {
    expect(panel).toContain("summaryTitleWithPeriodAndYear");
    expect(panel).toContain("entriesEmptyMonthSingle");
    expect(panel).toContain("periodBudgetReferenceSecondary");
    expect(panel).toContain("periodActualColumn");
    expect(panel).not.toContain('type="checkbox"');
  });

  it("28 page uses canonical URL params without page overflow hacks", () => {
    expect(actualsPage).toContain("parseFinanceMeasurementPeriodFromSearchParams");
    expect(actualsPage).toContain("periodStart");
    expect(slicer).toContain("overflow-x-auto");
  });

  it("month range click contract", () => {
    expect(
      resolveNextMonthRangeSelection({ currentStart: 8, currentEnd: 8, clickedIndex: 10 }),
    ).toEqual({ startIndex: 8, endIndex: 10 });
    expect(
      resolveNextMonthRangeSelection({ currentStart: 6, currentEnd: 9, clickedIndex: 7 }),
    ).toEqual({ startIndex: 7, endIndex: 7 });
  });
});

describe("FIN-03B-R1 quarter label", () => {
  it("prefers Qn YYYY over verbose month span", () => {
    const period = resolveFinanceMeasurementPeriod({
      financeYearId: "y1",
      financeYearName: "FY 2026",
      year: calendarYear,
      mode: "QUARTER",
      requestedPeriodStartIndex: 0,
      locale: "de-CH",
    });
    expect(period.displayLabel).toMatch(/^Q1 2026$/);
    expect(period.displayLabel).not.toMatch(/Jan.*Mär/i);
  });
});
