/**
 * Presentation helpers for tenant role chips — avoids duplicate visual chips
 * when legacy data contains multiple role rows with the same display name.
 */

export type RoleChipInput = { id: string; name: string; key: string };

export type DisplayRoleChip = {
  id: string;
  name: string;
  key: string;
  /** >1 when multiple distinct role records share the same display name. */
  assignmentCount: number;
  roleIds: string[];
};

/** Deduplicate by role id, then group by case-insensitive display name. */
export function groupRoleChipsForDisplay(roles: RoleChipInput[]): DisplayRoleChip[] {
  const byId = new Map<string, RoleChipInput>();
  for (const r of roles) {
    if (!byId.has(r.id)) byId.set(r.id, r);
  }

  const byName = new Map<string, DisplayRoleChip>();
  for (const r of byId.values()) {
    const nameKey = r.name.trim().toLowerCase();
    const existing = byName.get(nameKey);
    if (!existing) {
      byName.set(nameKey, {
        id: r.id,
        name: r.name,
        key: r.key,
        assignmentCount: 1,
        roleIds: [r.id],
      });
      continue;
    }
    if (!existing.roleIds.includes(r.id)) {
      existing.roleIds.push(r.id);
      existing.assignmentCount = existing.roleIds.length;
    }
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, "de"));
}
