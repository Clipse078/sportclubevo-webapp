import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deriveFinanceTimingMovementComposition,
  formatFinanceDirectionalMovementMinor,
  formatFinanceNetMovementMinor,
} from "@/lib/finance/presentation/finance-directional-movement-presentation";
import { FINANCE_FORECAST_TIMING_DIRECTION_04E_07R3_ARCHITECTURE_LOCKS } from "@/lib/finance/forecast/finance-forecast-timing-direction-07r3-architecture-contract";
import {
  buildFinanceMonthPickerMonthOptions,
  financeMonthPickerIsoFromValue,
  formatFinanceMonthPickerDisplayValue,
} from "@/lib/finance/forecast/finance-expected-month-picker";
import { timelineMarkerRadius } from "@/lib/finance/forecast/finance-forecast-timing-visual-layout";
import {
  financeForecastTimingCompactEmptyShowsGlobalCreateCta,
  financeForecastTimingUsesCompactEmptyTimeline,
} from "@/lib/finance/forecast/finance-forecast-timing-workspace-presentation";

const timingPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceForecastTimingWorkspacePanel.tsx"),
  "utf8",
);
const timeline = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceForecastTimingMovementTimeline.tsx"),
  "utf8",
);
const eventDialog = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceExpectedFinancialEventDialog.tsx"),
  "utf8",
);

describe("FIN-04E-07R3 architecture locks", () => {
  it("exports directional presentation boundaries", () => {
    expect(
      FINANCE_FORECAST_TIMING_DIRECTION_04E_07R3_ARCHITECTURE_LOCKS.SIGNED_AMOUNT_IS_PRESENTATION,
    ).toBe(true);
    expect(
      FINANCE_FORECAST_TIMING_DIRECTION_04E_07R3_ARCHITECTURE_LOCKS.GROSS_TIMING_COVERAGE_IS_NOT_NET_MOVEMENT,
    ).toBe(true);
    expect(
      FINANCE_FORECAST_TIMING_DIRECTION_04E_07R3_ARCHITECTURE_LOCKS.NET_MOVEMENT_IS_NOT_LIQUIDITY,
    ).toBe(true);
    expect(
      FINANCE_FORECAST_TIMING_DIRECTION_04E_07R3_ARCHITECTURE_LOCKS.NET_MOVEMENT_IS_NOT_PNL,
    ).toBe(true);
    expect(FINANCE_FORECAST_TIMING_DIRECTION_04E_07R3_ARCHITECTURE_LOCKS.INTEGER_MINOR_UNITS).toBe(
      true,
    );
  });
});

describe("FIN-04E-07R3 directional formatter", () => {
  it("prefixes income with + and expense with −", () => {
    expect(
      formatFinanceDirectionalMovementMinor({
        amountMinor: 60_000_00,
        direction: "INCOME",
        currency: "CHF",
        formattingLocale: "de-CH",
      }),
    ).toMatch(/^\+60[\u2019']000/);
    expect(
      formatFinanceDirectionalMovementMinor({
        amountMinor: 3_000_00,
        direction: "EXPENSE",
        currency: "CHF",
        formattingLocale: "de-CH",
      }),
    ).toMatch(/^−3[\u2019']000/);
  });

  it("respects tenant currency and locale", () => {
    const formatted = formatFinanceDirectionalMovementMinor({
      amountMinor: 1_000_00,
      direction: "INCOME",
      currency: "EUR",
      formattingLocale: "de-DE",
    });
    expect(formatted).toContain("EUR");
    expect(formatted.startsWith("+")).toBe(true);
  });

  it("defines zero as unsigned magnitude", () => {
    expect(
      formatFinanceDirectionalMovementMinor({
        amountMinor: 0,
        direction: "EXPENSE",
        currency: "CHF",
        formattingLocale: "de-CH",
      }),
    ).toMatch(/^0/);
    expect(
      formatFinanceDirectionalMovementMinor({
        amountMinor: 0,
        direction: "EXPENSE",
        currency: "CHF",
        formattingLocale: "de-CH",
      }),
    ).not.toMatch(/^[+−]/);
  });

  it("rejects non-integer and negative magnitudes", () => {
    expect(() =>
      formatFinanceDirectionalMovementMinor({
        amountMinor: 1.5,
        direction: "INCOME",
        currency: "CHF",
        formattingLocale: "de-CH",
      }),
    ).toThrow(/INTEGER_MINOR/);
    expect(() =>
      formatFinanceDirectionalMovementMinor({
        amountMinor: -100,
        direction: "INCOME",
        currency: "CHF",
        formattingLocale: "de-CH",
      }),
    ).toThrow(/NON_NEGATIVE/);
  });
});

describe("FIN-04E-07R3 summary composition", () => {
  it("keeps gross timed magnitude and derives net without conflating coverage", () => {
    const composition = deriveFinanceTimingMovementComposition({
      incomeMagnitudeMinor: 105_000_00,
      expenseMagnitudeMinor: 3_000_00,
    });
    expect(composition.grossMinor).toBe(108_000_00);
    expect(composition.netMovementMinor).toBe(102_000_00);
    expect(formatFinanceNetMovementMinor({
      netMovementMinor: composition.netMovementMinor,
      currency: "CHF",
      formattingLocale: "de-CH",
    })).toMatch(/^\+102/);
  });

  it("derives untimed net composition for UAT example magnitudes", () => {
    const composition = deriveFinanceTimingMovementComposition({
      incomeMagnitudeMinor: 53_794_00,
      expenseMagnitudeMinor: 2_037_00,
    });
    expect(composition.grossMinor).toBe(55_831_00);
    expect(composition.netMovementMinor).toBe(51_757_00);
  });
});

describe("FIN-04E-07R3 workspace wiring", () => {
  it("uses canonical directional formatter in panel and timeline", () => {
    expect(timingPanel).toContain("formatFinanceDirectionalMovementMinor");
    expect(timeline).toContain("formatFinanceDirectionalMovementMinor");
    expect(timingPanel).toContain("data-finance-timing-composition-net");
    expect(timeline).toContain("LANE_MID_INCOME");
    expect(timeline).toContain("LANE_MID_EXPENSE");
  });

  it("shows signed amounts in upcoming and events table", () => {
    expect(timingPanel).toContain("formatMovementAmount");
    expect(timingPanel).toContain("data-finance-timing-upcoming-row");
  });

  it("removes redundant unscheduled issue copy for partial rows", () => {
    expect(timingPanel).toContain('rowDensity === "PARTIAL_TIMED"');
    expect(timingPanel).toContain('issue === "unscheduled"');
  });
});

describe("FIN-04E-07R3 timeline materiality", () => {
  it("keeps marker radius bounded for small and large movements", () => {
    expect(timelineMarkerRadius(1)).toBeLessThanOrEqual(11);
    expect(timelineMarkerRadius(0)).toBeGreaterThanOrEqual(4);
    expect(timelineMarkerRadius(0.01)).toBeGreaterThan(timelineMarkerRadius(0));
  });
});

describe("FIN-04E-07R3 month picker", () => {
  it("outputs YYYY-MM-01 and locale month labels without day precision", () => {
    expect(financeMonthPickerIsoFromValue("2027-01")).toBe("2027-01-01");
    const options = buildFinanceMonthPickerMonthOptions({
      year: 2027,
      formattingLocale: "de-CH",
    });
    expect(options).toHaveLength(12);
    expect(options[0]?.value).toBe("2027-01");
    expect(formatFinanceMonthPickerDisplayValue({
      monthValue: "2027-03",
      formattingLocale: "de-CH",
    })).toMatch(/2027/);
  });

  it("replaces native month input in event dialog", () => {
    expect(eventDialog).toContain("FinanceExpectedMonthPicker");
    expect(eventDialog).not.toContain('type="month"');
  });
});

describe("FIN-04E-07R3 zero state regression", () => {
  it("preserves ZERO_TIMING compact guards", () => {
    expect(financeForecastTimingUsesCompactEmptyTimeline("ZERO_TIMING")).toBe(true);
    expect(financeForecastTimingCompactEmptyShowsGlobalCreateCta("ZERO_TIMING")).toBe(false);
    expect(timingPanel).toContain("financeForecastTimingSummaryShowsGlobalCreateCta");
  });
});
