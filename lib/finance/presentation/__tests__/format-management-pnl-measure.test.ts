import { describe, expect, it } from "vitest";
import {
  formatManagementPnlVarianceDelta,
  formatManagementPnlVariancePercent,
} from "@/lib/finance/presentation/format-management-pnl-measure";
import { formatManagementReportingVariancePercent } from "@/lib/finance/presentation/format-management-reporting-percent";
import { formatFinanceManagementMoneyMinor } from "@/lib/finance/presentation/finance-money-presentation";

describe("format-management-pnl-measure (FIN-05C R1)", () => {
  it("formats variance percentages for management reading", () => {
    expect(formatManagementReportingVariancePercent(34.88138666666667, "de-CH")).toMatch(
      /^34[.,]9%$/,
    );
    expect(formatManagementReportingVariancePercent(48.248000000000005, "en-GB")).toBe("48.2%");
    expect(formatManagementReportingVariancePercent(16.75304, "de-CH")).toMatch(/^16[.,]8%$/);
    expect(formatManagementReportingVariancePercent(0, "de-CH")).toBe("0%");
  });

  it("uses signed whole-currency variance deltas without altering minor units", () => {
    const rawDeltaMinor = 376_9400;
    const slice = {
      availability: "AVAILABLE" as const,
      baselineMinor: 100_00,
      comparisonMinor: 137_694_00,
      rawDeltaMinor,
      variancePercent: 34.88138666666667,
      favorability: "FAVORABLE" as const,
      absoluteVarianceMagnitudeMinor: rawDeltaMinor,
    };
    const display = formatManagementPnlVarianceDelta(slice, "CHF", "de-CH");
    expect(display.startsWith("+")).toBe(true);
    expect(display).not.toMatch(/\.\d{2}\s/);
    expect(formatFinanceManagementMoneyMinor(rawDeltaMinor, "CHF", "de-CH")).not.toContain(".34");
  });

  it("formats percent via slice helper", () => {
    expect(
      formatManagementPnlVariancePercent(
        {
          availability: "AVAILABLE",
          baselineMinor: 1,
          comparisonMinor: 2,
          rawDeltaMinor: 1,
          variancePercent: 48.248000000000005,
          favorability: "FAVORABLE",
          absoluteVarianceMagnitudeMinor: 1,
        },
        "en-GB",
      ),
    ).toBe("48.2%");
  });
});
