import type { ContextTabDefinition, ContextTabId } from "./types";

export const CONTEXT_TAB_QUERY_PARAM = "tab";

export function readContextTabParam(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams,
): string | null {
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(CONTEXT_TAB_QUERY_PARAM);
  }
  const raw = searchParams[CONTEXT_TAB_QUERY_PARAM];
  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }
  return raw ?? null;
}

/**
 * Resolve active tab from URL against visible tab config.
 * Unknown or hidden tabs fall back to `defaultTab`, then first visible tab.
 */
export function resolveContextTabFromSearchParams<TTabId extends ContextTabId>(input: {
  tabParam: string | null | undefined;
  defaultTab: TTabId;
  visibleTabs: ContextTabDefinition<TTabId>[];
}): TTabId {
  const visibleKeys = new Set(
    input.visibleTabs.filter((t) => t.visible !== false).map((t) => t.key),
  );

  if (
    typeof input.tabParam === "string" &&
    input.tabParam.length > 0 &&
    visibleKeys.has(input.tabParam as TTabId)
  ) {
    return input.tabParam as TTabId;
  }

  if (visibleKeys.has(input.defaultTab)) {
    return input.defaultTab;
  }

  const first = input.visibleTabs.find((t) => t.visible !== false);
  return (first?.key ?? input.defaultTab) as TTabId;
}

export function buildContextTabHref(basePath: string, tabKey: ContextTabId): string {
  const normalized = basePath.replace(/\/$/, "");
  const url = new URL(normalized, "http://local");
  url.searchParams.set(CONTEXT_TAB_QUERY_PARAM, tabKey);
  return `${url.pathname}${url.search}`;
}
