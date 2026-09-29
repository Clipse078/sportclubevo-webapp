"use client";

import type { SceListSelectorFetchParams } from "@/lib/sce/list-selector/use-sce-list-selector-query";
import type { SceSelectorResultGroup, SceSelectorSourceType } from "@/lib/sce/list-selector/types";
import type { SceSelectorAuthorizationContext } from "@/lib/sce/list-selector/selector-authorization-context";
import { parseSelectorSourceTypesParam } from "@/lib/sce/list-selector/communication-bridge";
import { fetchWithSceSelectorTimeout } from "@/lib/sce/list-selector/fetch-with-timeout";
import { sceSelectorDiscoverErrorForHttpStatus } from "@/lib/sce/list-selector/selector-discover-api-errors";
import type { SceSelectorCategoryId } from "@/lib/sce/list-selector/entity-presentation";

function categoryToParam(category: SceSelectorCategoryId): string {
  if (category === "org_unit") return "org_unit";
  if (category === "target_group") return "target_group";
  if (category === "external_contact") return "external_contact";
  if (category === "user") return "user";
  return category;
}

export function sceGenericDiscoverFetch(input: {
  authContext: SceSelectorAuthorizationContext;
  sourceTypes: readonly SceSelectorSourceType[];
  excludeUserIds?: readonly string[];
}) {
  const sourcesParam = input.sourceTypes.join(",");

  return async (params: SceListSelectorFetchParams): Promise<{
    groups: SceSelectorResultGroup[];
    noAccess?: boolean;
    error?: string;
  }> => {
    const cursorParam =
      params.cursors && Object.keys(params.cursors).length > 0
        ? `&cursors=${encodeURIComponent(JSON.stringify(params.cursors))}`
        : "";
    const excludeParam =
      input.excludeUserIds && input.excludeUserIds.length > 0
        ? `&excludeUserIds=${encodeURIComponent(input.excludeUserIds.join(","))}`
        : "";
    const res = await fetchWithSceSelectorTimeout(
      `/api/sce/selector/discover?authContext=${encodeURIComponent(input.authContext)}&category=${encodeURIComponent(categoryToParam(params.category))}&q=${encodeURIComponent(params.query.trim())}&sources=${encodeURIComponent(sourcesParam)}${cursorParam}${excludeParam}`,
      { signal: params.signal },
    );
    const data = (await res.json()) as {
      groups?: SceSelectorResultGroup[];
      noAccess?: boolean;
      error?: string;
    };
    if (!res.ok) {
      return {
        groups: [],
        error: sceSelectorDiscoverErrorForHttpStatus(res.status, data.error),
      };
    }
    return { groups: data.groups ?? [], noAccess: data.noAccess, error: data.error };
  };
}

export function parseDiscoverSourceTypes(raw: string | null): SceSelectorSourceType[] | null {
  return parseSelectorSourceTypesParam(raw);
}
