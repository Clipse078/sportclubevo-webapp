/**
 * Nav-aligned effective access for Person detail — same language as role builder.
 */

import type { PermissionMatrixModuleGroup } from "@/components/admin/roles/NavAlignedPermissionEditor";
import {
  buildNavPermissionPresentationFromModuleGroups,
  buildNavPermissionSummary,
  type NavPermissionSummarySection,
} from "@/lib/roles/nav-permission-presentation";
import { getUserEffectiveAccessView } from "@/lib/roles/effective-access";

export type PersonNavEffectiveAccessSection = NavPermissionSummarySection;

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
  const selected = new Set(view.effectiveTenantPermissionKeys);

  return buildNavPermissionSummary(presentation, selected).map((section) => ({
    ...section,
    items: section.items.filter((item) => item.access !== "Kein Zugriff"),
  })).filter((section) => section.items.length > 0);
}
