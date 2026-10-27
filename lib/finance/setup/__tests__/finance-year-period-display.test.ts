import { describe, expect, it } from "vitest";
import {
  formatFinanceCalendarDateLabel,
  formatFinanceYearPeriodLabel,
} from "@/lib/finance/setup/finance-year-period-display";

describe("formatFinanceCalendarDateLabel", () => {
  it("formats UTC calendar days for de-CH", () => {
    expect(formatFinanceCalendarDateLabel("2026-12-31", "de-CH")).toBe("31.12.2026");
    expect(formatFinanceCalendarDateLabel("2027-01-14", "de-CH")).toBe("14.01.2027");
  });
});

describe("formatFinanceYearPeriodLabel", () => {
  it("formats UTC calendar boundaries for de-CH", () => {
    expect(formatFinanceYearPeriodLabel("2026-01-01", "2026-12-31", "de-CH")).toBe(
      "01.01.2026 – 31.12.2026",
    );
  });

  it("supports split-year periods", () => {
    expect(formatFinanceYearPeriodLabel("2026-07-01", "2027-06-30", "de-CH")).toBe(
      "01.07.2026 – 30.06.2027",
    );
  });
});
