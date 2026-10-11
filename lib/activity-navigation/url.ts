import type { ActivityTabDefinition, ActivityTabKey } from "./types";

const TAB_PARAM = "tab";

const VALID_TAB_KEYS = new Set<ActivityTabKey>([
  "uebersicht",
  "teilnahme",
  "aufgebot",
  "planung",
  "spielbetrieb",
  "kommunikation",
  "mehr",
]);

export function isActivityTabKey(value: string | null | undefined): value is ActivityTabKey {
  return typeof value === "string" && VALID_TAB_KEYS.has(value as ActivityTabKey);
}

/**
 * Resolve the active tab from URL search params against visible tab config.
 * Unknown or hidden tabs fall back to `defaultTab`.
 */
export function resolveActivityTabFromSearchParams(input: {
  tabParam: string | null | undefined;
  defaultTab: ActivityTabKey;
  visibleTabs: ActivityTabDefinition[];
}): ActivityTabKey {
  const visibleKeys = new Set(
    input.visibleTabs.filter((t) => t.visible !== false).map((t) => t.key),
  );

  if (isActivityTabKey(input.tabParam) && visibleKeys.has(input.tabParam)) {
    return input.tabParam;
  }

  if (visibleKeys.has(input.defaultTab)) {
    return input.defaultTab;
  }

  const first = input.visibleTabs.find((t) => t.visible !== false);
  return first?.key ?? input.defaultTab;
}

export function buildActivityTabHref(basePath: string, tabKey: ActivityTabKey): string {
  const normalized = basePath.replace(/\/$/, "");
  const url = new URL(normalized, "http://local");
  url.searchParams.set(TAB_PARAM, tabKey);
  return `${url.pathname}${url.search}`;
}

export function readActivityTabParam(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams,
): string | null {
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(TAB_PARAM);
  }
  const raw = searchParams[TAB_PARAM];
  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }
  return raw ?? null;
}
