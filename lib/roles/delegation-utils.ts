/** Pure delegation helpers — safe for client and server bundles. */

export function findMissingDelegatedPermissions(
  actorPermissions: readonly string[],
  delegatedPermissions: readonly string[],
): string[] {
  const allowed = new Set(actorPermissions);
  const missing = Array.from(new Set(delegatedPermissions)).filter(
    (permission) => !allowed.has(permission),
  );
  return sortDelegationMissingPermissionKeys(missing);
}

export function sortDelegationMissingPermissionKeys(keys: readonly string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b));
}

export function formatDelegationForbiddenMessage(missingPermissionKeys: readonly string[]): string {
  const sorted = sortDelegationMissingPermissionKeys(missingPermissionKeys);
  if (sorted.length === 0) {
    return "Sie dürfen nur Berechtigungen und Rollen delegieren, die Sie selbst aktuell besitzen.";
  }
  return `Sie dürfen keine Berechtigungen delegieren, die Sie derzeit nicht besitzen. Fehlende Berechtigungen: ${sorted.join(", ")}`;
}
