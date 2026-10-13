/**
 * Nav-aligned effective access for Person detail — same language as role builder.
 */

import type { PermissionMatrixModuleGroup } from "@/components/admin/roles/NavAlignedPermissionEditor";
import { listUserPermissionOverrides } from "@/lib/admin/people-access/user-permission-overrides";
import type { PermissionOverrideRow } from "@/lib/permissions/apply-permission-overrides";
import {
  buildNavPermissionPresentationFromModuleGroups,
  buildNavPermissionSummary,
  type NavPermissionSummaryItem,
  type NavPermissionSummarySection,
  type PermissionPresentationSection,
  type PermissionUnit,
} from "@/lib/roles/nav-permission-presentation";
import { getUserEffectiveAccessView } from "@/lib/roles/effective-access";

export type PersonNavEffectiveAccessProvenance =
  | "Über Rolle"
  | "Individuell erlaubt"
  | "Individuell eingeschränkt";

export type PersonNavEffectiveAccessItem = NavPermissionSummaryItem & {
  provenance?: PersonNavEffectiveAccessProvenance;
};

export type PersonNavEffectiveAccessSection = Omit<NavPermissionSummarySection, "items"> & {
  items: PersonNavEffectiveAccessItem[];
};

function unitGrantKeys(unit: PermissionUnit, selectedKeys: Set<string>): string[] {
  const keys: string[] = [];
  if (!unit.isDerived) {
    for (const control of unit.standardControls) {
      for (const key of control.permissionKeys) {
        if (selectedKeys.has(key)) keys.push(key);
      }
    }
    for (const advanced of unit.advancedPermissions) {
      if (selectedKeys.has(advanced.key)) keys.push(advanced.key);
    }
  }
  return keys;
}

function deriveRoleBaselineFromEffective(
  effectiveKeys: Set<string>,
  overrides: readonly PermissionOverrideRow[],
): Set<string> {
  const baseline = new Set(effectiveKeys);
  for (const row of overrides) {
    if (row.effect === "ALLOW") baseline.delete(row.permissionKey);
    if (row.effect === "DENY") baseline.add(row.permissionKey);
  }
  return baseline;
}

function resolveProvenanceForKeys(
  keys: readonly string[],
  roleBaseline: Set<string>,
  overrides: readonly PermissionOverrideRow[],
): PersonNavEffectiveAccessProvenance | undefined {
  if (keys.length === 0) return undefined;
  const overrideByKey = new Map(overrides.map((row) => [row.permissionKey, row.effect]));
  let hasAllowOnly = false;
  let hasDeny = false;
  let allFromRole = true;

  for (const key of keys) {
    const effect = overrideByKey.get(key);
    if (effect === "DENY") {
      hasDeny = true;
      allFromRole = false;
    } else if (effect === "ALLOW" && !roleBaseline.has(key)) {
      hasAllowOnly = true;
      allFromRole = false;
    } else if (!roleBaseline.has(key)) {
      allFromRole = false;
    }
  }

  if (hasDeny) return "Individuell eingeschränkt";
  if (hasAllowOnly) return "Individuell erlaubt";
  if (allFromRole) return "Über Rolle";
  return undefined;
}

function attachProvenanceToSections(
  sections: NavPermissionSummarySection[],
  presentationSections: PermissionPresentationSection[],
  effectiveKeys: Set<string>,
  roleBaseline: Set<string>,
  overrides: readonly PermissionOverrideRow[],
): PersonNavEffectiveAccessSection[] {
  const unitsByLabel = new Map<string, PermissionUnit[]>();
  for (const section of presentationSections) {
    for (const unit of section.units) {
      const list = unitsByLabel.get(unit.label) ?? [];
      list.push(unit);
      unitsByLabel.set(unit.label, list);
    }
  }

  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const units = unitsByLabel.get(item.label) ?? [];
      const keys = units.flatMap((unit) => unitGrantKeys(unit, effectiveKeys));
      const provenance = resolveProvenanceForKeys(keys, roleBaseline, overrides);
      return provenance ? { ...item, provenance } : item;
    }),
  }));
}

/**
 * Returns only product areas where the user has granted access (no "Kein Zugriff" wall).
 */
export async function getPersonNavEffectiveAccessSections(
  tenantId: string,
  userId: string,
  moduleGroups: PermissionMatrixModuleGroup[],
): Promise<PersonNavEffectiveAccessSection[]> {
  const view = await getUserEffectiveAccessView(tenantId, userId);
  if (!view) return [];

  const presentation = buildNavPermissionPresentationFromModuleGroups(moduleGroups);
  const effectiveKeys = new Set(view.effectiveTenantPermissionKeys);
  const overrides = await listUserPermissionOverrides(tenantId, userId);
  const roleBaseline = deriveRoleBaselineFromEffective(effectiveKeys, overrides);

  const summary = buildNavPermissionSummary(presentation, effectiveKeys)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.access !== "Kein Zugriff"),
    }))
    .filter((section) => section.items.length > 0);

  return attachProvenanceToSections(
    summary,
    presentation.sections,
    effectiveKeys,
    roleBaseline,
    overrides,
  );
}
