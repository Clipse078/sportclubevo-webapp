import { describe, expect, it } from "vitest";
import { resolveFinanceCommitmentSelectedYearId } from "@/lib/finance/commitment/resolve-finance-commitment-selected-year";

describe("resolveFinanceCommitmentSelectedYearId", () => {
  const years = [
    { id: "fy-2027" },
    { id: "fy-2026" },
    { id: "fy-2025" },
  ];

  it("prefers explicit requested year when valid", () => {
    expect(
      resolveFinanceCommitmentSelectedYearId({
        requestedYearId: "fy-2025",
        years,
        currentFinanceYearId: "fy-2026",
      }),
    ).toBe("fy-2025");
  });

  it("uses configured current finance year before newest year", () => {
    expect(
      resolveFinanceCommitmentSelectedYearId({
        requestedYearId: null,
        years,
        currentFinanceYearId: "fy-2026",
      }),
    ).toBe("fy-2026");
  });

  it("falls back to newest year when current finance year is unset", () => {
    expect(
      resolveFinanceCommitmentSelectedYearId({
        requestedYearId: null,
        years,
        currentFinanceYearId: null,
      }),
    ).toBe("fy-2027");
  });
});
