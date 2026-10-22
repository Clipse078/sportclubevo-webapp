import { describe, expect, it } from "vitest";
import {
  budgetDraftInputFromMinor,
  formatBudgetPlanningMinor,
  parseBudgetInputToMinor,
  parseBudgetWholeMajorUnits,
  wholeMajorUnitsToMinor,
} from "@/lib/finance/budget/budget-amount-presentation";

describe("FIN-01D budget amount presentation", () => {
  it("parses plain whole-unit input to minor storage", () => {
    expect(parseBudgetInputToMinor("100000")).toBe(10_000_000);
    expect(parseBudgetInputToMinor("25000")).toBe(2_500_000);
    expect(wholeMajorUnitsToMinor(parseBudgetWholeMajorUnits("1500")!)).toBe(150_000);
  });

  it("formats whole-unit budget display with locale and currency", () => {
    const chf = formatBudgetPlanningMinor(12_500_000, "CHF", "de-CH");
    expect(chf).toMatch(/125.?000/);
    expect(chf).not.toMatch(/125,?000\.00/);

    const eur = formatBudgetPlanningMinor(2_500_000, "EUR", "de-DE");
    expect(eur).toMatch(/25.?000/);
  });

  it("does not hardcode CHF when currency is absent", () => {
    expect(formatBudgetPlanningMinor(1_000_000, null, "en-US")).toBe("10,000");
  });

  it("derives editing strings from minor storage without decimals", () => {
    expect(budgetDraftInputFromMinor(10_000_000)).toBe("100000");
    expect(budgetDraftInputFromMinor(null)).toBe("");
  });
});
