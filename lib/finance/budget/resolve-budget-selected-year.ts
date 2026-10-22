import type { FinanceYearStatus } from "@prisma/client";

export type BudgetYearOption = {
  id: string;
  status: FinanceYearStatus;
};

export function resolveBudgetSelectedYearId(input: {
  requestedYearId: string | null;
  years: ReadonlyArray<BudgetYearOption>;
  currentFinanceYearId: string | null;
}): string | null {
  const { requestedYearId, years, currentFinanceYearId } = input;
  if (requestedYearId) {
    return years.some((year) => year.id === requestedYearId) ? requestedYearId : null;
  }
  if (
    currentFinanceYearId &&
    years.some((year) => year.id === currentFinanceYearId)
  ) {
    return currentFinanceYearId;
  }
  const activeYears = years.filter((year) => year.status === "ACTIVE");
  if (activeYears.length === 1) {
    return activeYears[0]!.id;
  }
  return null;
}
