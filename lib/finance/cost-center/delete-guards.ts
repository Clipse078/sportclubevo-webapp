/**
 * Extensible dependency guards for FinanceCostCenter safe deletion.
 * Future financial entities register checks here without redesigning lifecycle.
 */

export type FinanceCostCenterDeleteGuardContext = {
  tenantId: string;
  costCenterId: string;
};

export type FinanceCostCenterDeleteGuardResult =
  | { allowed: true }
  | { allowed: false; reason: string; dependencyKind: string };

export type FinanceCostCenterDeleteGuard = (
  ctx: FinanceCostCenterDeleteGuardContext,
) => Promise<FinanceCostCenterDeleteGuardResult>;

const registeredGuards: FinanceCostCenterDeleteGuard[] = [];

export function registerFinanceCostCenterDeleteGuard(
  guard: FinanceCostCenterDeleteGuard,
): void {
  registeredGuards.push(guard);
}

/** Test-only reset */
export function resetFinanceCostCenterDeleteGuardsForTests(): void {
  registeredGuards.length = 0;
}

export async function evaluateFinanceCostCenterDeleteGuards(
  ctx: FinanceCostCenterDeleteGuardContext,
): Promise<FinanceCostCenterDeleteGuardResult> {
  for (const guard of registeredGuards) {
    const result = await guard(ctx);
    if (!result.allowed) return result;
  }
  return { allowed: true };
}
