import { describe, expect, it } from "vitest";
import { resolveBudgetSelectedYearId } from "@/lib/finance/budget/resolve-budget-selected-year";

describe("FIN-01D budget year selection", () => {
  const years = [
    { id: "y1", status: "DRAFT" as const },
    { id: "y2", status: "ACTIVE" as const },
    { id: "y3", status: "ACTIVE" as const },
  ];

  it("uses explicit URL year when valid", () => {
    expect(
      resolveBudgetSelectedYearId({
        requestedYearId: "y2",
        years,
        currentFinanceYearId: "y1",
      }),
    ).toBe("y2");
  });

  it("returns null for invalid or placeholder year requests", () => {
    expect(
      resolveBudgetSelectedYearId({
        requestedYearId: "missing",
        years,
        currentFinanceYearId: "y1",
      }),
    ).toBeNull();
    expect(
      resolveBudgetSelectedYearId({
        requestedYearId: null,
        years: [],
        currentFinanceYearId: null,
      }),
    ).toBeNull();
  });

  it("prefers configured current finance year when URL is absent", () => {
    expect(
      resolveBudgetSelectedYearId({
        requestedYearId: null,
        years,
        currentFinanceYearId: "y1",
      }),
    ).toBe("y1");
  });

  it("auto-selects only when exactly one ACTIVE year exists", () => {
    const singleActive = [
      { id: "y1", status: "DRAFT" as const },
      { id: "y2", status: "ACTIVE" as const },
    ];
    expect(
      resolveBudgetSelectedYearId({
        requestedYearId: null,
        years: singleActive,
        currentFinanceYearId: null,
      }),
    ).toBe("y2");
    expect(
      resolveBudgetSelectedYearId({
        requestedYearId: null,
        years,
        currentFinanceYearId: null,
      }),
    ).toBeNull();
  });
});
