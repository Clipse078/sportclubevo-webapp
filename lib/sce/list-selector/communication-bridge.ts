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

export function parseSelectorSourceTypesParam(raw: string | null): SceSelectorSourceType[] | null {
  if (!raw?.trim()) return null;
  const tokens = raw.split(",").map((t) => t.trim());
  const out: SceSelectorSourceType[] = [];
  for (const token of tokens) {
    if (token === "person" || token === "PERSON") out.push("PERSON");
    else if (token === "team" || token === "TEAM") out.push("TEAM");
    else if (token === "orgUnit" || token === "ORG_UNIT") out.push("ORG_UNIT");
    else if (token === "role" || token === "ROLE") out.push("ROLE");
    else if (token === "targetGroup" || token === "TARGET_GROUP") out.push("TARGET_GROUP");
    else if (token === "external" || token === "EXTERNAL_CONTACT") out.push("EXTERNAL_CONTACT");
  }
  return out.length ? out : null;
}
