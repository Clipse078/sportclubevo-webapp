import { assertSafeAmountMinor } from "@/lib/finance/money-types";

export type VarianceFavorability = "FAVORABLE" | "UNFAVORABLE" | "ON_PLAN";

export type AccountVarianceMetrics = {
  approvedBudgetMinor: number | null;
  actualMinor: number | null;
  hasApprovedBudget: boolean;
  hasActual: boolean;
  rawDeltaMinor: number | null;
  favorabilityMinor: number | null;
  favorability: VarianceFavorability | null;
  variancePercent: number | null;
};

function resolveFavorability(favorabilityMinor: number): VarianceFavorability {
  if (favorabilityMinor === 0) return "ON_PLAN";
  return favorabilityMinor > 0 ? "FAVORABLE" : "UNFAVORABLE";
}

/** Percent only when approved budget is non-zero and both sides exist. */
export function computeVariancePercent(
  rawDeltaMinor: number,
  approvedBudgetMinor: number,
): number | null {
  if (approvedBudgetMinor === 0) return null;
  return (rawDeltaMinor / approvedBudgetMinor) * 100;
}

/**
 * Canonical variance semantics (FIN-03A):
 * rawDelta = actual - budget
 * INCOME favorability = rawDelta
 * EXPENSE favorability = budget - actual
 */
export function computeAccountVarianceMetrics(input: {
  canonicalSemantic: "INCOME" | "EXPENSE";
  approvedBudgetMinor: number | null;
  actualMinor: number | null;
}): AccountVarianceMetrics {
  const hasApprovedBudget = input.approvedBudgetMinor !== null;
  const hasActual = input.actualMinor !== null;

  if (!hasApprovedBudget && !hasActual) {
    return {
      approvedBudgetMinor: null,
      actualMinor: null,
      hasApprovedBudget: false,
      hasActual: false,
      rawDeltaMinor: null,
      favorabilityMinor: null,
      favorability: null,
      variancePercent: null,
    };
  }

  const budget = input.approvedBudgetMinor ?? 0;
  const actual = input.actualMinor ?? 0;

  if (hasApprovedBudget) assertSafeAmountMinor(budget);
  if (hasActual) assertSafeAmountMinor(actual);

  if (!hasApprovedBudget || !hasActual) {
    return {
      approvedBudgetMinor: hasApprovedBudget ? budget : null,
      actualMinor: hasActual ? actual : null,
      hasApprovedBudget,
      hasActual,
      rawDeltaMinor: null,
      favorabilityMinor: null,
      favorability: null,
      variancePercent: null,
    };
  }

  const rawDeltaMinor = actual - budget;
  const favorabilityMinor =
    input.canonicalSemantic === "INCOME" ? rawDeltaMinor : budget - actual;

  return {
    approvedBudgetMinor: budget,
    actualMinor: actual,
    hasApprovedBudget: true,
    hasActual: true,
    rawDeltaMinor,
    favorabilityMinor,
    favorability: resolveFavorability(favorabilityMinor),
    variancePercent: computeVariancePercent(rawDeltaMinor, budget),
  };
}
