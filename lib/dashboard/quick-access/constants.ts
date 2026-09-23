/** Maximum pinned Schnellzugriff shortcuts (DASHBOARD-D spec). */
export const QUICK_ACCESS_MAX_PINS = 8;

/** Minimum shortcuts shown when defaults fill a sparse pin list. */
export const QUICK_ACCESS_MIN_DISPLAY = 4;

export const NAVIGATION_KEY_PREFIX = "navigation." as const;
export const ACTION_KEY_PREFIX = "action." as const;

export function navigationStableKey(navItemKey: string): string {
  return `${NAVIGATION_KEY_PREFIX}${navItemKey}`;
}

export function isNavigationStableKey(key: string): boolean {
  return key.startsWith(NAVIGATION_KEY_PREFIX);
}

export function isActionStableKey(key: string): boolean {
  return key.startsWith(ACTION_KEY_PREFIX);
}
