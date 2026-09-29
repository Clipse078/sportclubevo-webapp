import type { TenantUserItem } from "@/lib/users/queries";
import { groupRoleChipsForDisplay } from "@/lib/admin/people-access/role-display";

export type AccessColumnSummary = {
  primary: string;
  secondary?: string;
};

/**
 * Concise, truthful Zugriff column copy derived from role + scope assignments.
 */
export function buildAccessColumnSummary(user: TenantUserItem): AccessColumnSummary {
  if (user.isPlatformSystemIdentity) {
    return { primary: "Systemzugang", secondary: "Plattform" };
  }

  const roleChips = groupRoleChipsForDisplay(user.roles);
  const scoped = user.scopedRoles ?? [];

  if (roleChips.length === 0 && scoped.length === 0) {
    return { primary: "Kein Zugriff" };
  }

  const tenantWide =
    roleChips.length > 0 &&
    scoped.length === 0 &&
    roleChips.every((c) => c.assignmentCount >= 1);

  if (tenantWide && roleChips.length === 1) {
    return {
      primary: roleChips[0]!.name,
      secondary: "Gesamter Verein",
    };
  }

  if (roleChips.length === 0 && scoped.length === 1) {
    const s = scoped[0]!;
    return { primary: s.name, secondary: s.orgUnitName };
  }

  if (roleChips.length === 1 && scoped.length === 1 && roleChips[0]!.name === scoped[0]!.name) {
    return { primary: scoped[0]!.name, secondary: scoped[0]!.orgUnitName };
  }

  const fnCount = roleChips.length + scoped.length;
  const scopeHints = [
    ...roleChips.map(() => "Gesamter Verein"),
    ...scoped.map((s) => s.orgUnitName),
  ].filter(Boolean);

  if (fnCount === 2 && scopeHints.length === 2) {
    return {
      primary: `${fnCount} Funktionen`,
      secondary: scopeHints.join(" / "),
    };
  }

  if (roleChips.length === 1 && scoped.length > 0) {
    return {
      primary: roleChips[0]!.name,
      secondary: scoped.map((s) => s.orgUnitName).join(" · "),
    };
  }

  if (fnCount > 1) {
    const names = [...roleChips.map((r) => r.name), ...scoped.map((s) => s.name)];
    const uniqueNames = [...new Set(names)];
    return {
      primary: `${fnCount} Funktionen`,
      secondary: uniqueNames.slice(0, 3).join(" / "),
    };
  }

  return {
    primary: roleChips[0]?.name ?? scoped[0]?.name ?? "Zugriff",
    secondary: scopeHints[0],
  };
}
