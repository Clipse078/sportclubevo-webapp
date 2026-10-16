import type { SceIconRegistryName } from "@/components/design-system/icons/registry";
import { computeCompletenessBaseline } from "@/lib/nav/nav-ia-v2/build-current-inventory";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

/** Registry icons intentionally used by nav before an approved master exists. */
export const NAV_DESTINATION_PROVISIONAL_REGISTRY_ICONS = new Set<SceIconRegistryName>([
  "calendar",
]);

export const CANONICAL_SHELL_NAV_SCE_ICON_SURFACES = [
  "components/sce/navigation/SceDomainNavigationPanel.tsx",
  "components/admin/layout/GlobalNavDrawer.tsx",
  "components/ui/dashboard/PersonalQuickAccess.tsx",
] as const;

/** Import-scan roots where Lucide → SCE adoption is required for navigation. */
export const NAV_DOMAIN_ICON_INVENTORY_ROOTS = [
  "components/admin/layout/",
  "components/sce/navigation/",
  "components/nav/",
] as const;

/** Shell controls that may use utility Lucide glyphs (not L1/L2/L3 destination icons). */
export const NAV_DOMAIN_ICON_INVENTORY_EXCLUDED_FILES = new Set<string>([
  "components/sce/navigation/SceGlobalSeasonSwitcher.tsx",
]);

export function clubAdminNavigationCompletenessBaseline() {
  const permissionKeys = Object.values(PERMISSIONS) as PermissionKey[];
  return computeCompletenessBaseline(permissionKeys, "club");
}

export function filterNavScopedIconInventory<T extends { file: string }>(rows: T[]): T[] {
  return rows.filter(
    (row) =>
      NAV_DOMAIN_ICON_INVENTORY_ROOTS.some((root) => row.file.startsWith(root)) &&
      !NAV_DOMAIN_ICON_INVENTORY_EXCLUDED_FILES.has(row.file),
  );
}
