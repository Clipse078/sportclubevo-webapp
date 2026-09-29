import type {
  SceSelectorItem,
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
): Promise<SceSelectorItem[]> {
  const term = input.query.trim();
  const ctx = input.communicationContext;

  if (term.length >= SCE_SELECTOR_MIN_SEARCH_LENGTH) {
    switch (type) {
      case "PERSON":
        return searchPersonSelectorItems({
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          communicationContext: ctx,
          query: term,
          limit,
        });
      case "TEAM":
        return searchTeamSelectorItems({ tenantId: input.tenantId, query: term, limit });
      case "ORG_UNIT":
        return searchOrgUnitSelectorItems({ tenantId: input.tenantId, query: term, limit });
      case "ROLE":
        return searchRoleSelectorItems({ tenantId: input.tenantId, query: term, limit });
      case "TARGET_GROUP":
        return searchTargetGroupSelectorItems({ tenantId: input.tenantId, query: term, limit });
      case "EXTERNAL_CONTACT":
        return searchExternalContactSelectorItems({ tenantId: input.tenantId, query: term, limit });
      default:
        return [];
    }
  }

  switch (type) {
    case "PERSON":
      return browsePersonSelectorItems({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        communicationContext: ctx,
        limit,
      });
    case "TEAM":
      return browseTeamSelectorItems({ tenantId: input.tenantId, limit });
    case "ORG_UNIT":
      return browseOrgUnitSelectorItems({ tenantId: input.tenantId, limit });
    case "ROLE":
      return browseRoleSelectorItems({ tenantId: input.tenantId, limit });
    case "TARGET_GROUP":
      return browseTargetGroupSelectorItems({ tenantId: input.tenantId, limit });
    case "EXTERNAL_CONTACT":
      return browseExternalContactSelectorItems({ tenantId: input.tenantId, limit });
    default:
      return [];
  }
}

export async function discoverSceSelectorItems(
  input: SceSelectorQueryInput & { category: SceSelectorCategoryId },
): Promise<SceSelectorResultGroup[]> {
  const enabled = new Set(input.enabledTypes);
  const categoryTypes = sceSelectorCategoryToTypes(input.category);
  const typesToQuery: SceSelectorSourceType[] =
    categoryTypes === "all"
      ? (
          [
            "ORG_UNIT",
            "TEAM",
            "ROLE",
            "PERSON",
            "EXTERNAL_CONTACT",
            "TARGET_GROUP",
          ] as SceSelectorSourceType[]
        ).filter((t) => enabled.has(t))
      : categoryTypes.filter((t) => enabled.has(t));

  const groups: SceSelectorResultGroup[] = [];

  for (const type of typesToQuery) {
    const limit = limitForType(input.category, type, input.limitPerGroup);
    const items = await querySourceType(type, input, limit);
    if (items.length === 0) continue;
    groups.push({
      type,
      heading: sceSelectorPresentation(type).groupHeading,
      items,
    });
  }

  return groups;
}
