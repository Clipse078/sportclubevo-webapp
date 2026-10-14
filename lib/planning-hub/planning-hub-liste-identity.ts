/** Normalized comparison for planner-list identity deduplication. */
export function normalizePlannerListIdentity(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("de-CH");
}

/** True when secondary identity adds no information beyond primary (exact or equivalent). */
export function isRedundantPlannerListIdentity(primary: string, secondary: string): boolean {
  const a = normalizePlannerListIdentity(primary);
  const b = normalizePlannerListIdentity(secondary);
  if (!a || !b) return false;
  return a === b;
}
