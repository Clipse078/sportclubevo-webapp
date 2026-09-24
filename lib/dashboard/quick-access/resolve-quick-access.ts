import "server-only";

import { resolvePersonalContext } from "@/lib/dashboard/personal-context";
import { loadPersonalActionsModuleCapabilities } from "@/lib/personal-actions/access";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { buildQuickAccessCatalog } from "./build-catalog";
import {
  loadStoredQuickAccessPinnedKeys,
  resolveQuickAccessItemsFromKeys,
  resolveVisibleQuickAccessKeys,
} from "./preference-service";
import type { DashboardQuickAccessItemDto, QuickAccessCatalogEntry } from "./types";
import { getQuickAccessLabel } from "./labels";

export type ResolvedPersonalQuickAccess = {
  items: DashboardQuickAccessItemDto[];
  /** Accessible pinned keys in display order (defaults when none stored). */
  activeKeys: string[];
  hasStoredPreference: boolean;
  catalog: QuickAccessCatalogEntry[];
  maxPins: number;
};

export async function resolvePersonalQuickAccess(args: {
  tenantId: string;
  userId: string;
  permissionKeys: PermissionKey[];
  locale: string;
}): Promise<ResolvedPersonalQuickAccess> {
  const [personalActionsCaps, personalContext, stored] = await Promise.all([
    loadPersonalActionsModuleCapabilities({
      tenantId: args.tenantId,
      userId: args.userId,
      permissionKeys: args.permissionKeys,
    }),
    resolvePersonalContext({ tenantId: args.tenantId, userId: args.userId }),
    loadStoredQuickAccessPinnedKeys(args.tenantId, args.userId),
  ]);

  const catalogContext = {
    permissionKeys: args.permissionKeys,
    navCapabilities: {
      personalActionsModule: personalActionsCaps.moduleAccess,
    },
  };

  const catalog = buildQuickAccessCatalog(catalogContext);
  const catalogByKey = new Map(catalog.map((entry) => [entry.key, entry]));

  const activeKeys = resolveVisibleQuickAccessKeys({
    catalog,
    storedPinnedKeys: stored.pinnedKeys,
    hasStoredPreference: stored.hasStoredPreference,
    personalContext,
  });

  const labelResolver = (entry: QuickAccessCatalogEntry) =>
    getQuickAccessLabel(entry, args.locale);

  const items = resolveQuickAccessItemsFromKeys(activeKeys, catalogByKey, labelResolver);

  return {
    items,
    activeKeys,
    hasStoredPreference: stored.hasStoredPreference,
    catalog,
    maxPins: 8,
  };
}
