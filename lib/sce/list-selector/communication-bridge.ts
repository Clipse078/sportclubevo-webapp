/**
 * Maps between Communication audience discover shapes and SCE selector types.
 */

import type { CommunicationAudienceDiscoverCategory } from "@/lib/communication/audience/communication-audience-search-service";
import type { CommunicationAudienceSearchKind } from "@/lib/communication/audience/communication-audience-search-service";
import type { SceSelectorCategoryId } from "@/lib/sce/list-selector/entity-presentation";
import type { SceSelectorSourceType } from "@/lib/sce/list-selector/types";

const COMM_KIND_TO_SELECTOR: Record<CommunicationAudienceSearchKind, SceSelectorSourceType> = {
  person: "PERSON",
  team: "TEAM",
  orgUnit: "ORG_UNIT",
  role: "ROLE",
  targetGroup: "TARGET_GROUP",
  external: "EXTERNAL_CONTACT",
};

const SELECTOR_TO_COMM_KIND: Record<SceSelectorSourceType, CommunicationAudienceSearchKind> = {
  PERSON: "person",
  TEAM: "team",
  ORG_UNIT: "orgUnit",
  ROLE: "role",
  TARGET_GROUP: "targetGroup",
  EXTERNAL_CONTACT: "external",
};

export function communicationSearchKindToSelectorType(
  kind: CommunicationAudienceSearchKind,
): SceSelectorSourceType {
  return COMM_KIND_TO_SELECTOR[kind];
}

export function selectorTypeToCommunicationSearchKind(
  type: SceSelectorSourceType,
): CommunicationAudienceSearchKind {
  return SELECTOR_TO_COMM_KIND[type];
}

export function communicationCategoryToSelectorCategory(
  category: CommunicationAudienceDiscoverCategory,
): SceSelectorCategoryId {
  if (category === "all") return "all";
  if (category === "orgUnit") return "org_unit";
  if (category === "targetGroup") return "target_group";
  if (category === "external") return "external_contact";
  return category;
}

const SELECTOR_SOURCE_PARAM_ALIASES: Record<string, SceSelectorSourceType> = {
  person: "PERSON",
  PERSON: "PERSON",
  team: "TEAM",
  TEAM: "TEAM",
  orgUnit: "ORG_UNIT",
  ORG_UNIT: "ORG_UNIT",
  role: "ROLE",
  ROLE: "ROLE",
  targetGroup: "TARGET_GROUP",
  TARGET_GROUP: "TARGET_GROUP",
  external: "EXTERNAL_CONTACT",
  EXTERNAL_CONTACT: "EXTERNAL_CONTACT",
};

export function parseSelectorSourceTypesParam(raw: string | null): SceSelectorSourceType[] | null {
  if (!raw?.trim()) return null;
  const tokens = raw.split(",").map((t) => t.trim()).filter(Boolean);
  const out: SceSelectorSourceType[] = [];
  for (const token of tokens) {
    const mapped = SELECTOR_SOURCE_PARAM_ALIASES[token];
    if (mapped) out.push(mapped);
  }
  return out.length ? out : null;
}

export function parseSelectorSourceTypesParamStrict(raw: string | null): {
  types: SceSelectorSourceType[] | null;
  invalidTokens: string[];
} {
  if (!raw?.trim()) return { types: null, invalidTokens: [] };
  const tokens = raw.split(",").map((t) => t.trim()).filter(Boolean);
  const out: SceSelectorSourceType[] = [];
  const invalidTokens: string[] = [];
  for (const token of tokens) {
    const mapped = SELECTOR_SOURCE_PARAM_ALIASES[token];
    if (mapped) out.push(mapped);
    else invalidTokens.push(token);
  }
  return {
    types: out.length ? out : null,
    invalidTokens,
  };
}
