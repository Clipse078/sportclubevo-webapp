import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  enumerateFinanceYearMonths,
  enumerateFinanceYearQuarters,
  isEffectiveDateWithinMeasurementPeriod,
  parseMeasurementModeFromSearchParam,
  resolveFinanceMeasurementPeriod,
} from "@/lib/finance/actual/finance-measurement-period";
import { deriveManagementReviewSignals } from "@/lib/finance/actual/management-review-signals";
import { buildPeriodicActualReadModel } from "@/lib/finance/actual/periodic-account-read-model";
import {
  PERIOD_BUDGET_VARIANCE_SUPPORTED,
  YTD_BUDGET_VARIANCE_SUPPORTED,
} from "@/lib/finance/actual/period-semantics";
import { loadActualsWorkspaceSnapshot } from "@/lib/finance/services/finance-actual-query-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceActualsWorkspacePanel.tsx"),
  "utf8",
);
const actualsPage = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/actuals/page.tsx"),
  "utf8",
);

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

describe("FIN-03B period resolver", () => {
  const calendarYear = {
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: new Date("2026-12-31T00:00:00.000Z"),
  };

  const julyYear = {
    startDate: new Date("2026-07-01T00:00:00.000Z"),
    endDate: new Date("2027-06-30T00:00:00.000Z"),
  };

  it("A calendar-year FinanceYear enumerates twelve months", () => {
    const months = enumerateFinanceYearMonths(calendarYear);
    expect(months).toHaveLength(12);
    expect(months[0]!.startDate.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(months[9]!.startDate.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("B non-calendar FinanceYear month boundaries follow year start", () => {
    const months = enumerateFinanceYearMonths(julyYear);
    expect(months[0]!.startDate.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(months[3]!.startDate.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("D month period boundaries clip to FinanceYear", () => {
    const partialStart = {
      startDate: new Date("2026-01-15T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    };
    const months = enumerateFinanceYearMonths(partialStart);
    expect(months[0]!.startDate.toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(months[0]!.endDate.toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });

  it("finance-year-relative Q1/Q2 for July–June year", () => {
    const quarters = enumerateFinanceYearQuarters(julyYear);
    expect(quarters[0]!.startDate.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(quarters[0]!.endDate.toISOString()).toBe("2026-09-30T00:00:00.000Z");
    expect(quarters[1]!.startDate.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(quarters[1]!.endDate.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });

  it("E YTD cutoff respects reference inside year", () => {
    const period = resolveFinanceMeasurementPeriod({
      financeYearId: "y1",
      financeYearName: "FY 2026",
      year: calendarYear,
      mode: "YTD",
      referenceDate: new Date("2026-10-15T00:00:00.000Z"),
    });
    expect(period.ytdCutoffDate.toISOString()).toBe("2026-10-15T00:00:00.000Z");
  });

  it("R does not allow period outside FinanceYear via resolver index clamp", () => {
    const period = resolveFinanceMeasurementPeriod({
      financeYearId: "y1",
      financeYearName: "Geschäftsjahr 2026/2027",
      year: julyYear,
      mode: "MONTH",
      requestedPeriodIndex: 999,
      referenceDate: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(period.endDate.getTime()).toBeLessThanOrEqual(julyYear.endDate.getTime());
    expect(period.startDate.getTime()).toBeGreaterThanOrEqual(julyYear.startDate.getTime());
  });

  it("C uses custom FinanceYear.name in resolved period metadata", () => {
    const name = "Geschäftsjahr 2026/2027";
    const period = resolveFinanceMeasurementPeriod({
      financeYearId: "y1",
      financeYearName: name,
      year: julyYear,
      mode: "FULL_YEAR",
    });
    expect(period.financeYearName).toBe(name);
  });
});

describe("FIN-03B periodic read model", () => {
  const accounts = [
    {
      id: "inc",
      name: "Membership",
      canonicalSemantic: "INCOME" as const,
      lifecycle: "ACTIVE" as const,
    },
    {
      id: "exp",
      name: "Rent",
      canonicalSemantic: "EXPENSE" as const,
      lifecycle: "ACTIVE" as const,
    },
  ];

  const approvedMeasure = {
    budgetVersionId: "bv-1",
    valuesByAccountId: new Map([
      ["inc", 225_000_00],
      ["exp", 75_000_00],
    ]),
  };

  it("G/H/I month and YTD aggregation with result semantics", () => {
    const entries = [
      {
        financialAccountId: "inc",
        canonicalSemantic: "INCOME" as const,
        amountMinor: 25_000_00,
      },
      {
        financialAccountId: "exp",
        canonicalSemantic: "EXPENSE" as const,
        amountMinor: 18_000_00,
      },
      {
        financialAccountId: "inc",
        canonicalSemantic: "INCOME" as const,
        amountMinor: 75_000_00,
      },
    ];

    const periodEntries = entries.slice(0, 2);
    const ytdEntries = entries;

    const model = buildPeriodicActualReadModel({
      measurementMode: "MONTH",
      approvedMeasure,
      accounts,
      periodEntries,
      ytdEntries,
      fullYearEntries: ytdEntries,
    });

    expect(model.periodSummary.incomeMinor).toBe(25_000_00);
    expect(model.periodSummary.expenseMinor).toBe(18_000_00);
    expect(model.periodSummary.resultMinor).toBe(7_000_00);
    expect(model.ytdSummary.incomeMinor).toBe(100_000_00);
    expect(model.ytdSummary.expenseMinor).toBe(18_000_00);
    expect(model.periodBudgetVarianceSupported).toBe(false);
    expect(model.ytdBudgetVarianceSupported).toBe(false);
  });

  it("M no fake period budget variance flags", () => {
    expect(YTD_BUDGET_VARIANCE_SUPPORTED).toBe(false);
    expect(PERIOD_BUDGET_VARIANCE_SUPPORTED).toBe(false);
  });

  it("F full-year mode retains variance support flag", () => {
    const model = buildPeriodicActualReadModel({
      measurementMode: "FULL_YEAR",
      approvedMeasure,
      accounts,
      periodEntries: [],
      ytdEntries: [],
      fullYearEntries: [],
    });
    expect(model.fullYearVarianceSupported).toBe(true);
  });

  it("management review signals stay factual", () => {
    const model = buildPeriodicActualReadModel({
      measurementMode: "MONTH",
      approvedMeasure,
      accounts,
      periodEntries: [
        {
          financialAccountId: "exp",
          canonicalSemantic: "EXPENSE",
          amountMinor: 100,
        },
      ],
      ytdEntries: [
        {
          financialAccountId: "exp",
          canonicalSemantic: "EXPENSE",
          amountMinor: 100,
        },
      ],
      fullYearEntries: [],
    });
    const signals = deriveManagementReviewSignals({
      accounts: model.accounts,
    });
    expect(signals.some((s) => s.kind === "PERIOD_HAS_ACTIVITY")).toBe(false);
    expect(JSON.stringify(signals)).not.toMatch(/over budget|off track|unfavorable/i);
  });
});

describe("FIN-03B workspace snapshot integration", () => {
  it("J/K/L filters bookings and preserves URL params contract", () => {
    expect(actualsPage).toContain("parseFinanceMeasurementPeriodFromSearchParams");
    expect(actualsPage).toContain("parseMeasurementModeFromSearchParam");
    expect(panel).toContain("writeFinanceMeasurementPeriodToSearchParams");
    expect(panel).toContain("modeMonth");
    expect(panel).not.toMatch(/\/\s*12/);
  });

  it("J period booking filter uses measurement period boundaries", () => {
    const period = resolveFinanceMeasurementPeriod({
      financeYearId: "y1",
      financeYearName: "FY 2026",
      year: {
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T00:00:00.000Z"),
      },
      mode: "MONTH",
      requestedPeriodIndex: 9,
    });
    expect(
      isEffectiveDateWithinMeasurementPeriod(
        new Date("2026-10-15T00:00:00.000Z"),
        period,
      ),
    ).toBe(true);
    expect(
      isEffectiveDateWithinMeasurementPeriod(
        new Date("2026-11-15T00:00:00.000Z"),
        period,
      ),
    ).toBe(false);
  });
});

describe("FIN-03B URL mode parsing", () => {
  it("L maps search params to measurement modes", () => {
    expect(parseMeasurementModeFromSearchParam(undefined)).toBe("FULL_YEAR");
    expect(parseMeasurementModeFromSearchParam("ytd")).toBe("YTD");
    expect(parseMeasurementModeFromSearchParam("month")).toBe("MONTH");
    expect(parseMeasurementModeFromSearchParam("quarter")).toBe("QUARTER");
  });
});

describe("FIN-03B query service smoke", () => {
  it("loads periodic snapshot with ACTUALS view permission", async () => {
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
          effectiveDate: new Date("2026-10-05T00:00:00.000Z"),
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
          effectiveDate: new Date("2026-11-05T00:00:00.000Z"),
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
      ],
      financeBudget: [],
    };

    const db = {
      financeYear: {
        findMany: async () => store.financeYear,
      },
      financeConfiguration: {
        findUnique: async () => store.financeConfiguration[0],
      },
      financeActualEntry: {
        findMany: async () => store.financeActualEntry,
      },
      financeBudget: {
        findUnique: async () => null,
      },
      financialAccount: {
        findMany: async () => store.financialAccount,
      },
      financialReportingGroup: {
        findMany: async () => [],
      },
    };

    const { snapshot } = await loadActualsWorkspaceSnapshot(db as never, ctx(), {
      requestedYearId: "year-1",
      measurementMode: "MONTH",
      requestedPeriodIndex: 9,
      referenceDate: new Date("2026-10-20T00:00:00.000Z"),
    });

    expect(snapshot.entries).toHaveLength(1);
    expect(snapshot.entries[0]!.id).toBe("e1");
    expect(snapshot.periodic?.periodSummary.incomeMinor).toBe(1000);
    expect(snapshot.periodic?.ytdSummary.incomeMinor).toBe(1000);
  });
});

describe("FIN-03B presentation contracts", () => {
  it("U responsive table geometry includes PERIOD column mode", () => {
    expect(panel).toContain('"PERIOD"');
    expect(panel).toContain("periodActualColumn");
    expect(panel).not.toContain('type="checkbox"');
  });

  it("Q/P no sport season or calendar-year identity inference in panel", () => {
    expect(panel).not.toMatch(/sportSeason|seasonId/i);
    expect(panel).not.toContain("getFullYear()");
  });
});
