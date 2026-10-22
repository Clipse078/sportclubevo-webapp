import type { FinanceBudgetVersionStatus } from "@prisma/client";

export type BudgetVersionBaselineRef = {
  id: string;
  status: FinanceBudgetVersionStatus;
};

/**
 * Resolves the version that currently governs reporting and variance (FIN-02B).
 * Approval history and current baseline identity are intentionally separate.
 */
export function resolveCurrentGovernanceBaselineVersion<
  T extends BudgetVersionBaselineRef,
>(input: {
  currentBaselineVersionId: string | null;
  versions: ReadonlyArray<T>;
}): T | null {
  const { currentBaselineVersionId, versions } = input;
  if (currentBaselineVersionId) {
    const pointed = versions.find((v) => v.id === currentBaselineVersionId) ?? null;
    if (pointed?.status === "APPROVED") {
      return pointed;
    }
    return null;
  }

  const approved = versions.filter((v) => v.status === "APPROVED");
  if (approved.length === 1) {
    return approved[0]!;
  }
  return null;
}
