export type PermissionOverrideEffect = "ALLOW" | "DENY";

export type PermissionOverrideRow = {
  permissionKey: string;
  effect: PermissionOverrideEffect;
};

/**
 * Canonical effective permission set:
 *   (roleBaseline ∪ explicitAllows) − explicitDenies
 */
export function applyPermissionOverrides(
  roleBaselineKeys: ReadonlySet<string>,
  overrides: readonly PermissionOverrideRow[],
): Set<string> {
  const effective = new Set(roleBaselineKeys);
  for (const row of overrides) {
    if (row.effect === "ALLOW") {
      effective.add(row.permissionKey);
    } else {
      effective.delete(row.permissionKey);
    }
  }
  return effective;
}

export function countIndividualOverrides(overrides: readonly PermissionOverrideRow[]): number {
  return overrides.length;
}

export function overridesRecordFromRows(
  rows: readonly PermissionOverrideRow[],
): Record<string, PermissionOverrideEffect> {
  const out: Record<string, PermissionOverrideEffect> = {};
  for (const row of rows) {
    out[row.permissionKey] = row.effect;
  }
  return out;
}

export function overrideRowsFromRecord(
  record: Readonly<Record<string, PermissionOverrideEffect>>,
): PermissionOverrideRow[] {
  return Object.entries(record).map(([permissionKey, effect]) => ({
    permissionKey,
    effect,
  }));
}

/**
 * After a toggle changes the effective set, reconcile individual override rows
 * so redundant overrides (matching role baseline) are removed.
 */
export function reconcileOverridesFromEffectiveChange(
  roleBaseline: ReadonlySet<string>,
  nextEffective: ReadonlySet<string>,
): Record<string, PermissionOverrideEffect> {
  const overrides: Record<string, PermissionOverrideEffect> = {};
  const keys = new Set<string>([...roleBaseline, ...nextEffective]);
  for (const key of keys) {
    const baselineOn = roleBaseline.has(key);
    const effectiveOn = nextEffective.has(key);
    if (baselineOn === effectiveOn) continue;
    overrides[key] = effectiveOn ? "ALLOW" : "DENY";
  }
  return overrides;
}
