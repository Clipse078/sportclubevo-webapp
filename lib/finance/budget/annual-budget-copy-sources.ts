import { resolveCurrentGovernanceBaselineVersion } from "@/lib/finance/budget/current-governance-baseline";
import type { BudgetVersionBaselineRef } from "@/lib/finance/budget/current-governance-baseline";

export type AnnualBudgetYearRef = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
};

export type AnnualBudgetBaselineSource = {
  financeYearId: string;
  financeYearName: string;
  baselineVersionId: string;
};

/**
 * Preceding financial years are ordered by dates, not display names (FIN-02C).
 */
export function isStrictlyPrecedingFinancialYear(
  candidate: Pick<AnnualBudgetYearRef, "endDate">,
  target: Pick<AnnualBudgetYearRef, "startDate">,
): boolean {
  return candidate.endDate < target.startDate;
}

export function resolveEligibleAnnualBudgetCopySources(input: {
  targetYear: AnnualBudgetYearRef;
  years: ReadonlyArray<AnnualBudgetYearRef>;
  budgetsByFinanceYearId: ReadonlyMap<
    string,
    {
      currentBaselineVersionId: string | null;
      versions: ReadonlyArray<BudgetVersionBaselineRef>;
    }
  >;
}): AnnualBudgetBaselineSource[] {
  const eligible: AnnualBudgetBaselineSource[] = [];

  for (const year of input.years) {
    if (year.id === input.targetYear.id) continue;
    if (!isStrictlyPrecedingFinancialYear(year, input.targetYear)) continue;

    const budget = input.budgetsByFinanceYearId.get(year.id);
    if (!budget) continue;

    const baseline = resolveCurrentGovernanceBaselineVersion({
      currentBaselineVersionId: budget.currentBaselineVersionId,
      versions: budget.versions,
    });
    if (!baseline) continue;

    eligible.push({
      financeYearId: year.id,
      financeYearName: year.name,
      baselineVersionId: baseline.id,
    });
  }

  return eligible.sort((a, b) => {
    const yearA = input.years.find((y) => y.id === a.financeYearId)!;
    const yearB = input.years.find((y) => y.id === b.financeYearId)!;
    return yearB.startDate.getTime() - yearA.startDate.getTime();
  });
}

export function defaultAnnualBudgetCopySource(
  sources: ReadonlyArray<AnnualBudgetBaselineSource>,
): AnnualBudgetBaselineSource | null {
  return sources[0] ?? null;
}
