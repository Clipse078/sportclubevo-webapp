import type { ContextTabDefinition, ContextTabNavigationConfig } from "./types";

function visible(def: { visible?: boolean }): boolean {
  return def.visible !== false;
}

export function listVisiblePrimaryTabs<TTabId extends string>(
  config: ContextTabNavigationConfig<TTabId>,
): ContextTabDefinition<TTabId>[] {
  return config.tabs.filter((t) => t.placement === "primary" && visible(t));
}

export function listVisibleOverflowTabs<TTabId extends string>(
  config: ContextTabNavigationConfig<TTabId>,
): ContextTabDefinition<TTabId>[] {
  return config.tabs.filter((t) => t.placement === "overflow" && visible(t));
}

export function listAllVisibleTabs<TTabId extends string>(
  config: ContextTabNavigationConfig<TTabId>,
): ContextTabDefinition<TTabId>[] {
  return config.tabs.filter(visible);
}

/** Ordered navigable primary tabs for keyboard roving (excludes overflow menu destinations). */
export function listKeyboardNavigablePrimaryTabs<TTabId extends string>(
  config: ContextTabNavigationConfig<TTabId>,
): ContextTabDefinition<TTabId>[] {
  return listVisiblePrimaryTabs(config);
}
