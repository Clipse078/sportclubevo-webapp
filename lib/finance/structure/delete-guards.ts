/**
 * Extensible dependency guards for financial structure safe deletion.
 */

export type FinancialStructureDeleteGuardContext = {
  tenantId: string;
  entityType: "FinancialReportingGroup" | "FinancialAccount";
  entityId: string;
};

export type FinancialStructureDeleteGuardResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export type FinancialStructureDeleteGuard = (
  ctx: FinancialStructureDeleteGuardContext,
) => Promise<FinancialStructureDeleteGuardResult>;

const registeredGuards: FinancialStructureDeleteGuard[] = [];

export function registerFinancialStructureDeleteGuard(
  guard: FinancialStructureDeleteGuard,
): void {
  registeredGuards.push(guard);
}

export function resetFinancialStructureDeleteGuardsForTests(): void {
  registeredGuards.length = 0;
}

export async function evaluateFinancialStructureDeleteGuards(
  ctx: FinancialStructureDeleteGuardContext,
): Promise<FinancialStructureDeleteGuardResult> {
  for (const guard of registeredGuards) {
    const result = await guard(ctx);
    if (!result.allowed) return result;
  }
  return { allowed: true };
}
