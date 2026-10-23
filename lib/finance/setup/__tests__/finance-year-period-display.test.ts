import { describe, expect, it } from "vitest";
import { formatFinanceYearPeriodLabel } from "@/lib/finance/setup/finance-year-period-display";

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
