import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const overviewPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceOverviewPanel.tsx"),
  "utf8",
);

const financePage = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/page.tsx"),
  "utf8",
);

describe("FinanceOverviewPanel FIN-05D-R1", () => {
  it("uses decision hierarchy sections and semantic favourability labels", () => {
    expect(overviewPanel).toContain('data-finance-overview-section="financial-conclusion"');
    expect(overviewPanel).toContain('data-finance-overview-section="drivers"');
    expect(overviewPanel).toContain('data-finance-overview-section="expected-movement"');
    expect(overviewPanel).toContain("financeVarianceComparisonSemanticTextClass");
    expect(overviewPanel).toContain("data-finance-overview-favorability");
    expect(overviewPanel).not.toMatch(/\bCashflow\b/i);
    expect(overviewPanel).not.toMatch(/\bLiquidität\b/i);
  });

  it("uses compact expected-event timeline instead of FIN-04E movement chart", () => {
    expect(overviewPanel).toContain("FinanceOverviewExpectedEventTimeline");
    expect(overviewPanel).not.toContain("FinanceForecastTimingMovementTimeline");
    expect(overviewPanel).toContain("data-finance-overview-event-timeline");
  });

  it("consolidates timing CTA — no duplicate header link", () => {
    const headingEnd = overviewPanel.indexOf("expectedMovementZeroTiming");
    const movementHeader = overviewPanel.slice(
      overviewPanel.indexOf('data-finance-overview-section="expected-movement"'),
      headingEnd,
    );
    expect(movementHeader).not.toContain('href="/dashboard/finance/forecast/timing"');
    expect(overviewPanel).toContain('"data-finance-overview-timing-cta": "attention"');
    expect(overviewPanel).toContain('data-finance-overview-timing-cta="untimed-footer"');
  });

  it("localizes actual cutoff via locale formatter", () => {
    expect(overviewPanel).toContain("formatLocaleDateFromIso");
    expect(overviewPanel).not.toContain('replace("{date}", actualCutoffIso)');
  });

  it("wires favourability from actuals translation namespace on page", () => {
    expect(financePage).toContain('t("actuals.favorabilityFavorable")');
    expect(financePage).not.toContain('t("reporting.pnl.favorabilityFavorable")');
  });
});
