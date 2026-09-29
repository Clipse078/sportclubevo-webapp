/**
 * SCE-SELECTOR-01 — entity labels for selector UI (no feature semantics).
 */

import type { SceSelectorSourceType } from "@/lib/sce/list-selector/types";

export type SceSelectorEntityPresentation = {
  typeLabel: string;
  groupHeading: string;
  categoryTabLabel: string;
};

const PRESENTATION: Record<SceSelectorSourceType, SceSelectorEntityPresentation> = {
  PERSON: {
    typeLabel: "Person",
    groupHeading: "Personen",
    categoryTabLabel: "Personen",
  },
  TEAM: {
    typeLabel: "Team",
    groupHeading: "Teams",
    categoryTabLabel: "Teams",
  },
  ORG_UNIT: {
    typeLabel: "Organisationseinheit",
    groupHeading: "Organisation",
    categoryTabLabel: "Organisation",
  },
  ROLE: {
    typeLabel: "Rolle",
    groupHeading: "Rollen",
    categoryTabLabel: "Rollen",
  },
  TARGET_GROUP: {
    typeLabel: "Zielgruppe",
    groupHeading: "Zielgruppen",
    categoryTabLabel: "Zielgruppen",
  },
  EXTERNAL_CONTACT: {
    typeLabel: "Externer Kontakt",
    groupHeading: "Externe",
    categoryTabLabel: "Externe",
  },
};

export function sceSelectorPresentation(type: SceSelectorSourceType): SceSelectorEntityPresentation {
  return PRESENTATION[type];
}

export const SCE_SELECTOR_CATEGORY_TABS: {
  id: SceSelectorCategoryId;
  type: SceSelectorSourceType | "all";
  label: string;
}[] = [
  { id: "all", type: "all", label: "Alle" },
  { id: "org_unit", type: "ORG_UNIT", label: "Organisation" },
  { id: "team", type: "TEAM", label: "Teams" },
  { id: "role", type: "ROLE", label: "Rollen" },
  { id: "person", type: "PERSON", label: "Personen" },
  { id: "external_contact", type: "EXTERNAL_CONTACT", label: "Externe" },
  { id: "target_group", type: "TARGET_GROUP", label: "Zielgruppen" },
];

export type SceSelectorCategoryId =
  | "all"
  | "person"
  | "team"
  | "org_unit"
  | "role"
  | "target_group"
  | "external_contact";

export function sceSelectorCategoryToTypes(
  category: SceSelectorCategoryId,
): SceSelectorSourceType[] | "all" {
  if (category === "all") return "all";
  const map: Record<Exclude<SceSelectorCategoryId, "all">, SceSelectorSourceType> = {
    person: "PERSON",
    team: "TEAM",
    org_unit: "ORG_UNIT",
    role: "ROLE",
    target_group: "TARGET_GROUP",
    external_contact: "EXTERNAL_CONTACT",
  };
  return [map[category]];
}

export function sceSelectorTypeToCategoryId(type: SceSelectorSourceType): SceSelectorCategoryId {
  const map: Record<SceSelectorSourceType, SceSelectorCategoryId> = {
    PERSON: "person",
    TEAM: "team",
    ORG_UNIT: "org_unit",
    ROLE: "role",
    TARGET_GROUP: "target_group",
    EXTERNAL_CONTACT: "external_contact",
  };
  return map[type];
}
