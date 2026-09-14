import { describe, expect, it } from "vitest";
import {
  addMonthsBillingUtc,
  computeMonthlyBillingPeriod,
  formatBillingDateOnly,
  parseBillingDateOnly,
  resolveDueBillableMonthlyPeriod,
} from "../billing-period";

describe("billing-period (monthly)", () => {
  it("computes first monthly period from contract start", () => {
    const start = parseBillingDateOnly("2026-09-01");
    const period = computeMonthlyBillingPeriod(start, 0);
    expect(formatBillingDateOnly(period.periodStart)).toBe("2026-09-01");
    expect(formatBillingDateOnly(period.periodEnd)).toBe("2026-09-30");
  });

  it("computes subsequent monthly period", () => {
    const start = parseBillingDateOnly("2026-09-01");
    const period = computeMonthlyBillingPeriod(start, 1);
    expect(formatBillingDateOnly(period.periodStart)).toBe("2026-10-01");
    expect(formatBillingDateOnly(period.periodEnd)).toBe("2026-10-31");
  });

  it("handles month length differences (February non-leap)", () => {
    const start = parseBillingDateOnly("2026-01-31");
    const jan = computeMonthlyBillingPeriod(start, 0);
    expect(formatBillingDateOnly(jan.periodStart)).toBe("2026-01-31");
    expect(formatBillingDateOnly(jan.periodEnd)).toBe("2026-02-27");
    const feb = computeMonthlyBillingPeriod(start, 1);
    expect(formatBillingDateOnly(feb.periodStart)).toBe("2026-02-28");
    expect(formatBillingDateOnly(feb.periodEnd)).toBe("2026-03-30");
  });

  it("handles year boundary", () => {
    const start = parseBillingDateOnly("2026-12-15");
    const dec = computeMonthlyBillingPeriod(start, 0);
    expect(formatBillingDateOnly(dec.periodStart)).toBe("2026-12-15");
    expect(formatBillingDateOnly(dec.periodEnd)).toBe("2027-01-14");
    const jan = computeMonthlyBillingPeriod(start, 1);
    expect(formatBillingDateOnly(jan.periodStart)).toBe("2027-01-15");
  });

  it("addMonthsBillingUtc clamps Jan 31 to Feb 28 in non-leap year", () => {
    const d = parseBillingDateOnly("2026-01-31");
    const feb = addMonthsBillingUtc(d, 1);
    expect(formatBillingDateOnly(feb)).toBe("2026-02-28");
  });

  it("returns NOT_DUE before first period start", () => {
    const start = parseBillingDateOnly("2026-09-01");
    const asOf = parseBillingDateOnly("2026-08-31");
    const result = resolveDueBillableMonthlyPeriod({
      contractStart: start,
      contractEnd: null,
      asOfDate: asOf,
      isPeriodInvoiced: () => false,
    });
    expect(result.kind).toBe("NOT_DUE");
  });

  it("returns PERIOD when due and not invoiced", () => {
    const start = parseBillingDateOnly("2026-09-01");
    const asOf = parseBillingDateOnly("2026-09-01");
    const result = resolveDueBillableMonthlyPeriod({
      contractStart: start,
      contractEnd: null,
      asOfDate: asOf,
      isPeriodInvoiced: () => false,
    });
    expect(result.kind).toBe("PERIOD");
    if (result.kind === "PERIOD") {
      expect(formatBillingDateOnly(result.period.periodStart)).toBe("2026-09-01");
    }
  });

  it("skips invoiced period and selects next due period", () => {
    const start = parseBillingDateOnly("2026-09-01");
    const asOf = parseBillingDateOnly("2026-10-05");
    const sep = computeMonthlyBillingPeriod(start, 0);
    const result = resolveDueBillableMonthlyPeriod({
      contractStart: start,
      contractEnd: null,
      asOfDate: asOf,
      isPeriodInvoiced: (s, e) =>
        formatBillingDateOnly(s) === formatBillingDateOnly(sep.periodStart) &&
        formatBillingDateOnly(e) === formatBillingDateOnly(sep.periodEnd),
    });
    expect(result.kind).toBe("PERIOD");
    if (result.kind === "PERIOD") {
      expect(formatBillingDateOnly(result.period.periodStart)).toBe("2026-10-01");
    }
  });

  it("treats VOID as not invoiced when callback excludes VOID rows", () => {
    const start = parseBillingDateOnly("2026-09-01");
    const asOf = parseBillingDateOnly("2026-09-15");
    const result = resolveDueBillableMonthlyPeriod({
      contractStart: start,
      contractEnd: null,
      asOfDate: asOf,
      isPeriodInvoiced: () => false,
    });
    expect(result.kind).toBe("PERIOD");
  });

  it("returns ENDED when contract ended before next period", () => {
    const start = parseBillingDateOnly("2026-09-01");
    const end = parseBillingDateOnly("2026-09-30");
    const asOf = parseBillingDateOnly("2026-10-01");
    const result = resolveDueBillableMonthlyPeriod({
      contractStart: start,
      contractEnd: end,
      asOfDate: asOf,
      isPeriodInvoiced: () => true,
    });
    expect(result.kind).toBe("ENDED");
  });

  it("returns NOT_DUE for next month when current month already invoiced mid-month", () => {
    const start = parseBillingDateOnly("2026-09-01");
    const asOf = parseBillingDateOnly("2026-09-20");
    const sep = computeMonthlyBillingPeriod(start, 0);
    const result = resolveDueBillableMonthlyPeriod({
      contractStart: start,
      contractEnd: null,
      asOfDate: asOf,
      isPeriodInvoiced: (s, e) =>
        formatBillingDateOnly(s) === formatBillingDateOnly(sep.periodStart) &&
        formatBillingDateOnly(e) === formatBillingDateOnly(sep.periodEnd),
    });
    expect(result.kind).toBe("NOT_DUE");
  });
});
