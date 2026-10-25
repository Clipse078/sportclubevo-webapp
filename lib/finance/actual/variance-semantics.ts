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

export type SemanticVarianceMetrics = {
  baselineMinor: number | null;
  comparisonMinor: number | null;
  hasBaseline: boolean;
  hasComparison: boolean;
  rawDeltaMinor: number | null;
  favorabilityMinor: number | null;
  favorability: VarianceFavorability | null;
  variancePercent: number | null;
};

/**
 * Canonical comparison variance (FIN-03A / FIN-05B):
 * rawDeltaMinor = comparisonMinor - baselineMinor
 * INCOME favorabilityMinor = rawDeltaMinor
 * EXPENSE favorabilityMinor = baselineMinor - comparisonMinor
 */
export function computeSemanticVarianceMetrics(input: {
  canonicalSemantic: "INCOME" | "EXPENSE";
  baselineMinor: number | null;
  comparisonMinor: number | null;
}): SemanticVarianceMetrics {
  const hasBaseline = input.baselineMinor !== null;
  const hasComparison = input.comparisonMinor !== null;

  if (!hasBaseline && !hasComparison) {
    return {
      baselineMinor: null,
      comparisonMinor: null,
      hasBaseline: false,
      hasComparison: false,
      rawDeltaMinor: null,
      favorabilityMinor: null,
      favorability: null,
      variancePercent: null,
    };
  }

  const baseline = input.baselineMinor ?? 0;
  const comparison = input.comparisonMinor ?? 0;

  if (hasBaseline) assertSafeAmountMinor(baseline);
  if (hasComparison) assertSafeAmountMinor(comparison);

  if (!hasBaseline || !hasComparison) {
    return {
      baselineMinor: hasBaseline ? baseline : null,
      comparisonMinor: hasComparison ? comparison : null,
      hasBaseline,
      hasComparison,
      rawDeltaMinor: null,
      favorabilityMinor: null,
      favorability: null,
      variancePercent: null,
    };
  }

  const rawDeltaMinor = comparison - baseline;
  const favorabilityMinor =
    input.canonicalSemantic === "INCOME" ? rawDeltaMinor : baseline - comparison;

  return {
    baselineMinor: baseline,
    comparisonMinor: comparison,
    hasBaseline: true,
    hasComparison: true,
    rawDeltaMinor,
    favorabilityMinor,
    favorability: resolveFavorability(favorabilityMinor),
    variancePercent: computeVariancePercent(rawDeltaMinor, baseline),
  };
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
  const core = computeSemanticVarianceMetrics({
    canonicalSemantic: input.canonicalSemantic,
    baselineMinor: input.approvedBudgetMinor,
    comparisonMinor: input.actualMinor,
  });
  return {
    approvedBudgetMinor: core.baselineMinor,
    actualMinor: core.comparisonMinor,
    hasApprovedBudget: core.hasBaseline,
    hasActual: core.hasComparison,
    rawDeltaMinor: core.rawDeltaMinor,
    favorabilityMinor: core.favorabilityMinor,
    favorability: core.favorability,
    variancePercent: core.variancePercent,
  };
}
