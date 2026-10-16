import {
  getVisibleNavSections,
  type NavCapabilityContext,
  type NavItem,
  type NavItemChild,
} from "@/lib/nav/nav-config";
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
      if (item.children && item.children.length > 0) {
        for (const child of item.children) {
          pushNavEntry(entries, child, navDefaultPriority(order));
          order += 1;
        }
      } else {
        pushNavEntry(entries, item, navDefaultPriority(order));
        order += 1;
      }
    }
  }

  return [...entries.values()];
}

/** Canonical Schnellzugriff registry: workspace navigation only (creation uses global + Erstellen). */
export function buildQuickAccessCatalog(context: QuickAccessCatalogContext): QuickAccessCatalogEntry[] {
  return buildNavigationEntries(context);
}

export function catalogEntryMap(
  context: QuickAccessCatalogContext,
): Map<string, QuickAccessCatalogEntry> {
  return new Map(buildQuickAccessCatalog(context).map((entry) => [entry.key, entry]));
}
