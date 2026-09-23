import {
  getVisibleNavSections,
  type NavCapabilityContext,
  type NavItem,
  type NavItemChild,
} from "@/lib/nav/nav-config";
import {
  DASHBOARD_QUICK_ACTION_CATALOG,
  QUICK_ACCESS_CREATE_ACTION_BINDINGS,
} from "@/lib/dashboard/quick-actions";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { navigationStableKey } from "./constants";
import type { QuickAccessCatalogEntry, QuickAccessCatalogContext } from "./types";

const NAV_EXCLUDED_KEYS = new Set(["dashboard"]);

function navDefaultPriority(index: number): number {
  return 100 - index;
}

function pushNavEntry(
  entries: Map<string, QuickAccessCatalogEntry>,
  item: Pick<NavItem | NavItemChild, "key" | "label" | "href" | "permissionKeys"> & {
    navIconLabel?: string;
  },
  priority: number,
): void {
  if (NAV_EXCLUDED_KEYS.has(item.key)) {
    return;
  }
  const key = navigationStableKey(item.key);
  if (entries.has(key)) {
    return;
  }
  entries.set(key, {
    key,
    kind: "NAVIGATION",
    href: item.href,
    iconLabel: item.navIconLabel ?? item.label,
    messageKey: `PersonalDashboard.quickAccess.entries.${key.replace(/\./g, "_")}`,
    navItemKey: item.key,
    permissionKeys: item.permissionKeys ?? [],
    defaultPriority: priority,
  });
}

function buildNavigationEntries(context: QuickAccessCatalogContext): QuickAccessCatalogEntry[] {
  const navCapabilities: NavCapabilityContext = {
    personalActionsModule: context.navCapabilities.personalActionsModule,
  };
  const sections = getVisibleNavSections(
    context.permissionKeys,
    "club",
    navCapabilities,
  );

  const entries = new Map<string, QuickAccessCatalogEntry>();
  let order = 0;

  for (const section of sections) {
    for (const item of section.items) {
      pushNavEntry(entries, item, navDefaultPriority(order));
      order += 1;
      if (item.children) {
        for (const child of item.children) {
          pushNavEntry(entries, child, navDefaultPriority(order));
          order += 1;
        }
      }
    }
  }

  return [...entries.values()];
}

function hasAnyPermission(userKeys: PermissionKey[], required: PermissionKey[]): boolean {
  if (required.length === 0) {
    return true;
  }
  return required.some((key) => userKeys.includes(key));
}

function buildCreateActionEntries(context: QuickAccessCatalogContext): QuickAccessCatalogEntry[] {
  const catalogByKey = new Map(DASHBOARD_QUICK_ACTION_CATALOG.map((entry) => [entry.key, entry]));
  const entries: QuickAccessCatalogEntry[] = [];

  for (const binding of QUICK_ACCESS_CREATE_ACTION_BINDINGS) {
    if (!hasAnyPermission(context.permissionKeys, [...binding.permissionKeys])) {
      continue;
    }
    const source = catalogByKey.get(binding.catalogKey);
    if (!source) {
      continue;
    }
    entries.push({
      key: binding.stableKey,
      kind: "CREATE_ACTION",
      href: source.href,
      iconLabel: source.title,
      messageKey: `PersonalDashboard.quickAccess.entries.${binding.stableKey.replace(/\./g, "_")}`,
      catalogActionKey: binding.catalogKey,
      permissionKeys: [...binding.permissionKeys],
      defaultPriority: 40,
    });
  }

  return entries;
}

/** Canonical Schnellzugriff registry derived from sidebar nav + create-action catalog. */
export function buildQuickAccessCatalog(context: QuickAccessCatalogContext): QuickAccessCatalogEntry[] {
  const navEntries = buildNavigationEntries(context);
  const createEntries = buildCreateActionEntries(context);
  return [...navEntries, ...createEntries];
}

export function catalogEntryMap(
  context: QuickAccessCatalogContext,
): Map<string, QuickAccessCatalogEntry> {
  return new Map(buildQuickAccessCatalog(context).map((entry) => [entry.key, entry]));
}
