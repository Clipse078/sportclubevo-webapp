import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PROJECTION_GERMAN_PRODUCT_TERMS } from "@/lib/finance/projection/projection-architecture-contract";
import {
  AUTOMATIC_FORECAST_PRESENTATION_PRECISION,
  formatFinanceAutomaticForecastMoneyMinor,
  formatFinanceAutomaticForecastSignedMinor,
  roundAmountMinorToWholeMajorPresentation,
} from "@/lib/finance/projection/projection-amount-presentation";
import { buildProjectionWorkspaceViewModel } from "@/lib/finance/projection/projection-workspace-presentation";
import { computeProjectionAggregateCoverage } from "@/lib/finance/projection/projection-workspace-coverage";

const deMessages = readFileSync(resolve(process.cwd(), "messages/de.json"), "utf8");
const projectionSection = readFileSync(
  resolve(process.cwd(), "components/admin/finance/FinanceProjectionWorkspaceSection.tsx"),
  "utf8",
);

describe("FIN-04B-05R2 tenant terminology", () => {
  it("uses canonical Automatische Prognose and Aktuelle Prognose anchors", () => {
    expect(PROJECTION_GERMAN_PRODUCT_TERMS.automaticForecast).toBe("Automatische Prognose");
    expect(PROJECTION_GERMAN_PRODUCT_TERMS.currentForecast).toBe("Aktuelle Prognose");
    expect(PROJECTION_GERMAN_PRODUCT_TERMS.applyAction).toBe("Automatische Prognose übernehmen");
  });

  it("removes tenant-facing SCE-Projektion strings from German messages", () => {
    expect(deMessages).not.toContain("SCE-Projektion");
    expect(deMessages).not.toContain("SCE-Einnahmen");
    expect(deMessages).not.toContain("SCE-Ausgaben");
    expect(deMessages).not.toContain("SCE-Ergebnis");
    expect(deMessages).not.toContain("Prognose vs. SCE");
    expect(deMessages).toContain("Automatische Prognose");
    expect(deMessages).toContain("Aktuelle Prognose");
  });

  it("uses automatic forecast presentation formatters in projection workspace UI", () => {
    expect(projectionSection).toContain("formatFinanceAutomaticForecastMoneyMinor");
    expect(projectionSection).toContain("formatFinanceAutomaticForecastSignedMinor");
  });
});

describe("FIN-04B-05R2 automatic forecast presentation precision", () => {
  it("declares whole-currency presentation precision", () => {
    expect(AUTOMATIC_FORECAST_PRESENTATION_PRECISION).toBe("WHOLE_CURRENCY_UNIT");
  });

  it("rounds CHF fractional minor down below half major unit", () => {
    const minor = 23_632_704;
    const formatted = formatFinanceAutomaticForecastMoneyMinor(minor, "CHF", "de-CH");
    expect(formatted).toMatch(/236.327\s*CHF/);
    expect(formatted).not.toMatch(/[.,]\d{2}\s/);
    expect(roundAmountMinorToWholeMajorPresentation(minor, "CHF")).toBe(23_632_700);
  });

  it("rounds CHF .50 minor up to next whole major unit", () => {
    const minor = 23_632_750;
    expect(formatFinanceAutomaticForecastMoneyMinor(minor, "CHF", "de-CH")).toMatch(/236.328\s*CHF/);
  });

  it("rounds signed deltas with currency suffix", () => {
    expect(formatFinanceAutomaticForecastSignedMinor(2_703_704, "CHF", "de-CH")).toMatch(
      /\+27.037\s*CHF/,
    );
    expect(formatFinanceAutomaticForecastSignedMinor(-2_703_750, "CHF", "de-CH")).toMatch(
      /−27.038\s*CHF/,
    );
  });

  it("handles zero and large values", () => {
    expect(formatFinanceAutomaticForecastMoneyMinor(0, "CHF", "de-CH")).toContain("0");
    expect(formatFinanceAutomaticForecastMoneyMinor(101_161_04, "CHF", "de-CH")).toMatch(
      /101.161\s*CHF/,
    );
  });

  it("does not mutate stored minor when rounding for display", () => {
    const persisted = 23_632_704;
    roundAmountMinorToWholeMajorPresentation(persisted, "CHF");
    expect(persisted).toBe(23_632_704);
  });
});

describe("FIN-04B-05R2 partial coverage preservation", () => {
  it("withholds result total when coverage incomplete", () => {
    const coverage = computeProjectionAggregateCoverage([
      { accountId: "a1", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: 100_000_00 },
      { accountId: "a2", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: null },
    ]);
    expect(coverage.result.complete).toBe(false);
    expect(coverage.result.minor).toBeNull();

    const vm = buildProjectionWorkspaceViewModel({
      financeYearId: "fy1",
      financeYearName: "FY",
      version: {
        id: "pv-test",
        versionNumber: 1,
        actualsThroughDate: "2026-10-24",
        generatedAt: new Date(),
        dataSufficiency: "LIMITED",
        evidenceFingerprint: "fp",
      },
      staleness: "FRESH",
      lines: [
        {
          financialAccountId: "a1",
          projectedAmountMinor: 100_000_00,
          lowerBoundMinor: null,
          upperBoundMinor: null,
          methodologyFamily: "RUN_RATE",
          dataSufficiency: "SUFFICIENT",
          confidence: "MEDIUM",
        },
      ],
      forecastAmountByAccountId: new Map(),
      coverageAccounts: [
        { accountId: "a1", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: 100_000_00 },
        { accountId: "a2", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: null },
      ],
      accountNameById: new Map([
        ["a1", "A"],
        ["a2", "B"],
      ]),
      explainabilityByAccountId: new Map(),
      explainabilityDetailByAccountId: new Map(),
      budgetTotals: null,
      adoption: null,
    });
    expect(vm.coverage.result.minor).toBeNull();
  });
});
