import type { SceIconRegistryName } from "@/components/design-system/icons/registry";

/**
 * SCE-ICONS-02 — canonical nav destination → approved SCE hero icon names.
 * Keys match {@link NavItem.key} / {@link NavItemChild.key} in nav-config.
 */
export const NAV_DESTINATION_SCE_ICON_BY_KEY = {
  dashboard: "dashboard",
  wochenplanner: "week-planner",
  trainingcenter: "training",
  matchcenter: "match",
  tournamentcenter: "tournament",
} as const satisfies Record<string, SceIconRegistryName>;

export type NavDestinationSceIconKey = keyof typeof NAV_DESTINATION_SCE_ICON_BY_KEY;

export function getNavDestinationSceIconName(
  navItemKey: string,
): SceIconRegistryName | null {
  return (
    NAV_DESTINATION_SCE_ICON_BY_KEY[
      navItemKey as NavDestinationSceIconKey
    ] ?? null
  );
}

/** Quick-access stable keys use the `navigation.{navItemKey}` prefix. */
export function getQuickAccessNavItemKey(stableKey: string): string | null {
  const prefix = "navigation.";
  if (!stableKey.startsWith(prefix)) {
    return null;
  }
  return stableKey.slice(prefix.length);
}

export function getQuickAccessSceIconName(
  stableKey: string,
): SceIconRegistryName | null {
  const navItemKey = getQuickAccessNavItemKey(stableKey);
  if (!navItemKey) {
    return null;
  }
  return getNavDestinationSceIconName(navItemKey);
}
