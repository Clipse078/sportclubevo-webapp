import { describe, expect, it } from "vitest";
import {
  formatBudgetPlanningSignedWholeMajorNumber,
  formatBudgetPlanningWholeMajorNumber,
} from "@/lib/finance/budget/budget-amount-presentation";
import { FORECAST_PHASING_SUPPORTED } from "@/lib/finance/forecast/forecast-contract";

describe("FIN-04A R2 forecast UX contracts", () => {
  it("formats resting table numbers with locale grouping", () => {
    expect(formatBudgetPlanningWholeMajorNumber(175_000_00, "de-CH")).toBe("175'000");
  });

  it("keeps explicit variance sign for favorable and unfavorable deltas", () => {
    expect(formatBudgetPlanningSignedWholeMajorNumber(5_000_00, "de-CH")).toBe("+5'000");
    expect(formatBudgetPlanningSignedWholeMajorNumber(-5_000_00, "de-CH")).toBe("−5'000");
    expect(formatBudgetPlanningSignedWholeMajorNumber(0, "de-CH")).toBe("0");
  });

  it("does not introduce forecast phasing", () => {
    expect(FORECAST_PHASING_SUPPORTED).toBe(false);
  });
});
