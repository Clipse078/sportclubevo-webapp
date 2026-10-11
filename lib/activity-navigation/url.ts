import type { ActivityTabDefinition, ActivityTabKey } from "./types";
import {
  buildContextTabHref,
  readContextTabParam,
  resolveContextTabFromSearchParams,
} from "@/lib/context-tabs/url";

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

/** @deprecated Prefer `resolveContextTabFromSearchParams` from `@/lib/context-tabs`. */
export function resolveActivityTabFromSearchParams(input: {
  tabParam: string | null | undefined;
  defaultTab: ActivityTabKey;
  visibleTabs: ActivityTabDefinition[];
}): ActivityTabKey {
  return resolveContextTabFromSearchParams(input);
}

/** Preserves historical activity deep-link shape (`?tab=`). */
export function buildActivityTabHref(basePath: string, tabKey: ActivityTabKey): string {
  return buildContextTabHref(basePath, tabKey);
}

export function readActivityTabParam(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams,
): string | null {
  return readContextTabParam(searchParams);
}
