import type {
  SceSelectorQueryInput,
  SceSelectorResultGroup,
  SceSelectorSourceType,
} from "@/lib/sce/list-selector/types";
import { sceSelectorPresentation } from "@/lib/sce/list-selector/entity-presentation";
import type { SceSelectorCategoryId } from "@/lib/sce/list-selector/entity-presentation";
import { sceSelectorCategoryToTypes } from "@/lib/sce/list-selector/entity-presentation";
import {
  SCE_SELECTOR_ALL_CATEGORY_BROWSE_LIMITS,
  SCE_SELECTOR_DEFAULT_BROWSE_LIMIT,
  SCE_SELECTOR_MIN_SEARCH_LENGTH,
} from "@/lib/sce/list-selector/sources/constants";
import { browsePersonSelectorItems, searchPersonSelectorItems } from "@/lib/sce/list-selector/sources/person-selector-source";
import { browseTeamSelectorItems, searchTeamSelectorItems } from "@/lib/sce/list-selector/sources/team-selector-source";
import {
  browseOrgUnitSelectorItems,
  searchOrgUnitSelectorItems,
} from "@/lib/sce/list-selector/sources/org-unit-selector-source";
import { browseRoleSelectorItems, searchRoleSelectorItems } from "@/lib/sce/list-selector/sources/role-selector-source";
import {
  browseTargetGroupSelectorItems,
  searchTargetGroupSelectorItems,
} from "@/lib/sce/list-selector/sources/target-group-selector-source";
import {
  browseExternalContactSelectorItems,
  searchExternalContactSelectorItems,
} from "@/lib/sce/list-selector/sources/external-contact-selector-source";
import {
  browseUserSelectorItems,
  searchUserSelectorItems,
} from "@/lib/sce/list-selector/sources/user-selector-source";
import {
  browseTaskOrgUnitSelectorItems,
  searchTaskOrgUnitSelectorItems,
} from "@/lib/sce/list-selector/sources/task-org-unit-selector-source";
import { withSceSelectorSourceTimeout } from "@/lib/sce/list-selector/source-query-timeout";
import type { SceSelectorSourcePage } from "@/lib/sce/list-selector/source-pagination";

function limitForType(category: SceSelectorCategoryId, type: SceSelectorSourceType, limitPerGroup?: number): number {
  if (limitPerGroup != null) return limitPerGroup;
  if (category === "all") {
    return SCE_SELECTOR_ALL_CATEGORY_BROWSE_LIMITS[type] ?? SCE_SELECTOR_DEFAULT_BROWSE_LIMIT;
  }
  return SCE_SELECTOR_DEFAULT_BROWSE_LIMIT;
}

async function querySourceType(
  type: SceSelectorSourceType,
  input: SceSelectorQueryInput,
  limit: number,
  cursor: string | null | undefined,
): Promise<SceSelectorSourcePage> {
  const term = input.query.trim();
  const ctx = input.communicationContext;
  const authContext = input.authorizationContext;

  if (term.length >= SCE_SELECTOR_MIN_SEARCH_LENGTH) {
    switch (type) {
      case "PERSON":
        return searchPersonSelectorItems({
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          communicationContext: ctx,
          authorizationContext: authContext,
          query: term,
          limit,
          cursor,
        });
      case "USER":
        return searchUserSelectorItems({
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          query: term,
          limit,
          cursor,
          excludeUserIds: input.excludeUserIds,
        });
      case "TEAM":
        return searchTeamSelectorItems({ tenantId: input.tenantId, query: term, limit, cursor });
      case "ORG_UNIT":
        if (authContext === "TASK_ASSIGNMENT") {
          return searchTaskOrgUnitSelectorItems({
            tenantId: input.tenantId,
            actorUserId: input.actorUserId,
            query: term,
            limit,
            cursor,
          });
        }
        return searchOrgUnitSelectorItems({ tenantId: input.tenantId, query: term, limit, cursor });
      case "ROLE":
        return searchRoleSelectorItems({ tenantId: input.tenantId, query: term, limit, cursor });
      case "TARGET_GROUP":
        return searchTargetGroupSelectorItems({ tenantId: input.tenantId, query: term, limit, cursor });
      case "EXTERNAL_CONTACT":
        return searchExternalContactSelectorItems({ tenantId: input.tenantId, query: term, limit, cursor });
      default:
        return { items: [], hasMore: false, nextCursor: null };
    }
  }

  switch (type) {
    case "PERSON":
      return browsePersonSelectorItems({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        communicationContext: ctx,
        authorizationContext: authContext,
        limit,
        cursor,
      });
    case "USER":
      return browseUserSelectorItems({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        limit,
        cursor,
        excludeUserIds: input.excludeUserIds,
      });
    case "TEAM":
      return browseTeamSelectorItems({ tenantId: input.tenantId, limit, cursor });
    case "ORG_UNIT":
      if (authContext === "TASK_ASSIGNMENT") {
        return browseTaskOrgUnitSelectorItems({
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          limit,
          cursor,
        });
      }
      return browseOrgUnitSelectorItems({ tenantId: input.tenantId, limit, cursor });
    case "ROLE":
      return browseRoleSelectorItems({ tenantId: input.tenantId, limit, cursor });
    case "TARGET_GROUP":
      return browseTargetGroupSelectorItems({ tenantId: input.tenantId, limit, cursor });
    case "EXTERNAL_CONTACT":
      return browseExternalContactSelectorItems({ tenantId: input.tenantId, limit, cursor });
    default:
      return { items: [], hasMore: false, nextCursor: null };
  }
}

export type DiscoverSceSelectorItemsResult = {
  groups: SceSelectorResultGroup[];
  /** Set when at least one enabled source failed but others may have succeeded. */
  partialFailure?: boolean;
};

function resolveTypesToQuery(input: {
  enabledTypes: readonly SceSelectorSourceType[];
  category: SceSelectorCategoryId;
  cursors?: Partial<Record<SceSelectorSourceType, string | null>>;
}): SceSelectorSourceType[] {
  const enabled = new Set(input.enabledTypes);
  const categoryTypes = sceSelectorCategoryToTypes(input.category);
  const continuationTypes =
    input.cursors && Object.keys(input.cursors).length > 0
      ? (Object.keys(input.cursors) as SceSelectorSourceType[]).filter((t) => enabled.has(t))
      : null;

  if (continuationTypes?.length) {
    return continuationTypes.filter((t) =>
      categoryTypes === "all" ? true : categoryTypes.includes(t),
    );
  }

  return categoryTypes === "all"
    ? (
        [
          "ORG_UNIT",
          "TEAM",
          "ROLE",
          "PERSON",
          "USER",
          "EXTERNAL_CONTACT",
          "TARGET_GROUP",
        ] as SceSelectorSourceType[]
      ).filter((t) => enabled.has(t))
    : categoryTypes.filter((t) => enabled.has(t));
}

export async function discoverSceSelectorItems(
  input: SceSelectorQueryInput & { category: SceSelectorCategoryId },
): Promise<SceSelectorResultGroup[]> {
  const result = await discoverSceSelectorItemsDetailed(input);
  return result.groups;
}

export async function discoverSceSelectorItemsDetailed(
  input: SceSelectorQueryInput & { category: SceSelectorCategoryId },
): Promise<DiscoverSceSelectorItemsResult> {
  const typesToQuery = resolveTypesToQuery({
    enabledTypes: input.enabledTypes,
    category: input.category,
    cursors: input.cursors,
  });

  const settled = await Promise.allSettled(
    typesToQuery.map(async (type) => {
      const limit = limitForType(input.category, type, input.limitPerGroup);
      const cursor = input.cursors?.[type] ?? null;
      const page = await withSceSelectorSourceTimeout(type, querySourceType(type, input, limit, cursor));
      return { type, page };
    }),
  );

  const groups: SceSelectorResultGroup[] = [];
  let failures = 0;

  for (const entry of settled) {
    if (entry.status === "rejected") {
      failures += 1;
      continue;
    }
    const { type, page } = entry.value;
    if (page.items.length === 0 && !page.hasMore) continue;
    groups.push({
      type,
      heading: sceSelectorPresentation(type).groupHeading,
      items: page.items,
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    });
  }

  if (failures > 0 && groups.length === 0 && typesToQuery.length > 0) {
    throw new Error("SCE_SELECTOR_ALL_SOURCES_FAILED");
  }

  return {
    groups,
    partialFailure: failures > 0 && groups.length > 0,
  };
}
