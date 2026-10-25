import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const overviewPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceOverviewPanel.tsx"),
  "utf8",
);

describe("FinanceOverviewPanel FIN-05D", () => {
  it("uses decision hierarchy sections and semantic favourability", () => {
    expect(overviewPanel).toContain('data-finance-overview-section="financial-conclusion"');
    expect(overviewPanel).toContain('data-finance-overview-section="drivers"');
    expect(overviewPanel).toContain('data-finance-overview-section="expected-movement"');
    expect(overviewPanel).toContain("financeVarianceComparisonSemanticTextClass");
    expect(overviewPanel).not.toMatch(/\bCashflow\b/i);
    expect(overviewPanel).not.toMatch(/\bLiquidität\b/i);
  });

  it("reuses FIN-04E movement timeline without direction arrows as sole meaning", () => {
    expect(overviewPanel).toContain("FinanceForecastTimingMovementTimeline");
    expect(overviewPanel).not.toContain("↑");
    expect(overviewPanel).not.toContain("↓");
  });
});
