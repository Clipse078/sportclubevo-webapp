import { describe, expect, it } from "vitest";
import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
import {
  buildFin07dUatAmountsForThreshold,
  resolveFin07dUatPreferredThresholdMinor,
  verifyFin07dUatEconomicBoundary,
} from "@/lib/finance/commitment/finance-07d-uat-commitment-seed-ledger";

describe("FIN-07D UAT seed ledger amount semantics", () => {
  it("builds one whole major unit below / at / above threshold in minor units", () => {
    const threshold = resolveFin07dUatPreferredThresholdMinor("CHF");
    expect(threshold).toBe(100_000);
    const amounts = buildFin07dUatAmountsForThreshold(threshold, "CHF");
    expect(amounts).toEqual({
      belowMinor: 99_900,
      exactMinor: 100_000,
      aboveMinor: 100_100,
    });
    expect(verifyFin07dUatEconomicBoundary({
      ...amounts,
      thresholdMinor: threshold,
    })).toEqual({
      belowLtThreshold: true,
      exactEqThreshold: true,
      aboveGtThreshold: true,
    });
  });

  it("produces distinct whole-currency ledger displays for the UAT triple", () => {
    const amounts = buildFin07dUatAmountsForThreshold(100_000, "CHF");
    const locale = "de-CH";
    const displays = [
      formatFinanceManagementPlanningMinor(amounts.belowMinor, "CHF", locale),
      formatFinanceManagementPlanningMinor(amounts.exactMinor, "CHF", locale),
      formatFinanceManagementPlanningMinor(amounts.aboveMinor, "CHF", locale),
    ];
    expect(new Set(displays).size).toBe(3);
    expect(displays[0]).toContain("999");
    expect(displays[1]).toContain("1'000");
    expect(displays[2]).toContain("1'001");
  });

  it("rejects misaligned sub-major thresholds", () => {
    expect(() => buildFin07dUatAmountsForThreshold(100_001, "CHF")).toThrow(/whole major/);
  });
});
