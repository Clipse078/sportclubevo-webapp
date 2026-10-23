import { describe, expect, it } from "vitest";
import {
  isStrictlyPrecedingFinancialYear,
  resolveEligibleAnnualBudgetCopySources,
} from "@/lib/finance/budget/annual-budget-copy-sources";

describe("annual budget copy sources (FIN-02C)", () => {
  const years = [
    {
      id: "fy-2025",
      name: "Geschäftsjahr A",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
    },
    {
      id: "fy-2026",
      name: "FY 2026",
      startDate: new Date("2027-01-01"),
      endDate: new Date("2027-12-31"),
    },
    {
      id: "fy-2027",
      name: "FY 2027",
      startDate: new Date("2028-01-01"),
      endDate: new Date("2028-12-31"),
    },
  ];

  it("orders preceding years by start date, not display name", () => {
    const target = years[2]!;
    const budgets = new Map([
      [
        "fy-2025",
        {
          currentBaselineVersionId: "v-2025",
          versions: [{ id: "v-2025", status: "APPROVED" as const }],
        },
      ],
      [
        "fy-2026",
        {
          currentBaselineVersionId: "v-2026",
          versions: [{ id: "v-2026", status: "APPROVED" as const }],
        },
      ],
    ]);

    const sources = resolveEligibleAnnualBudgetCopySources({
      targetYear: target,
      years,
      budgetsByFinanceYearId: budgets,
    });

    expect(sources.map((s) => s.financeYearId)).toEqual(["fy-2026", "fy-2025"]);
  });

  it("excludes future and overlapping years", () => {
    expect(
      isStrictlyPrecedingFinancialYear(
        { endDate: new Date("2027-12-31") },
        { startDate: new Date("2028-01-01") },
      ),
    ).toBe(true);
    expect(
      isStrictlyPrecedingFinancialYear(
        { endDate: new Date("2028-06-30") },
        { startDate: new Date("2028-01-01") },
      ),
    ).toBe(false);
  });

  it("excludes years without current approved baseline", () => {
    const target = years[2]!;
    const budgets = new Map([
      [
        "fy-2026",
        {
          currentBaselineVersionId: null,
          versions: [{ id: "draft-only", status: "DRAFT" as const }],
        },
      ],
    ]);

    expect(
      resolveEligibleAnnualBudgetCopySources({
        targetYear: target,
        years,
        budgetsByFinanceYearId: budgets,
      }),
    ).toEqual([]);
  });
});
