import { isClubAdminRoleKey } from "@/lib/admin/people-access/role-product-copy";

export type WizardAssignableRole = {
  id: string;
  name: string;
  key: string;
  isSystem: boolean;
  description: string | null;
};

/**
 * RPERM-05-C1: legacy tenants may have two Club Admin role rows
 * (`club_admin__*` vs `club_admin_*`). The invitation wizard must expose
 * exactly one product-facing Club Admin choice — mapped to the canonical key.
 */
export function pickCanonicalClubAdminRole(
  clubAdminRoles: WizardAssignableRole[],
  clubAdminRoleKey: string,
): WizardAssignableRole | null {
  if (clubAdminRoles.length === 0) return null;
  if (clubAdminRoles.length === 1) return clubAdminRoles[0] ?? null;

  const exact = clubAdminRoles.find((r) => r.key === clubAdminRoleKey);
  if (exact) return exact;

  const system = clubAdminRoles.find((r) => r.isSystem);
  if (system) return system;

  return [...clubAdminRoles].sort((a, b) => a.key.localeCompare(b.key, "de"))[0] ?? null;
}

export function dedupeAssignableRolesForWizard(
  roles: WizardAssignableRole[],
  clubAdminRoleKey: string,
): WizardAssignableRole[] {
  const clubAdminRoles = roles.filter((r) => isClubAdminRoleKey(r.key, clubAdminRoleKey));
  const other = roles.filter((r) => !isClubAdminRoleKey(r.key, clubAdminRoleKey));
  const canonical = pickCanonicalClubAdminRole(clubAdminRoles, clubAdminRoleKey);
  const merged = canonical ? [...other, canonical] : other;
  return merged.sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Map a legacy Club Admin role id to the canonical assignable id before submit. */
export function normalizeRoleIdsForAssignment(
  roleIds: string[],
  allRoles: WizardAssignableRole[],
  clubAdminRoleKey: string,
): string[] {
  const clubAdminRoles = allRoles.filter((r) => isClubAdminRoleKey(r.key, clubAdminRoleKey));
  const canonical = pickCanonicalClubAdminRole(clubAdminRoles, clubAdminRoleKey);
  if (!canonical) return Array.from(new Set(roleIds));

  const legacyIds = new Set(
    clubAdminRoles.filter((r) => r.id !== canonical.id).map((r) => r.id),
  );

  return Array.from(
    new Set(
      roleIds.map((id) => (legacyIds.has(id) ? canonical.id : id)),
    ),
  );
}
