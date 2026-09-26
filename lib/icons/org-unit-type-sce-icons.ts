import type { SceIconRegistryName } from "@/components/design-system/icons/registry";

/** Organisationseinheit type → approved SCE master (semantic, not decorative status). */
export const ORG_UNIT_TYPE_SCE_ICON: Record<string, SceIconRegistryName> = {
  CLUB: "club",
  DIVISION: "organisation",
  DEPARTMENT: "org-unit",
  SUB_DEPARTMENT: "org-unit",
  TEAM: "team",
  COMMITTEE: "committee-board",
  PROJECT_GROUP: "org-unit",
  CUSTOM: "org-unit",
};

export function getOrgUnitTypeSceIconName(type: string): SceIconRegistryName {
  return ORG_UNIT_TYPE_SCE_ICON[type] ?? "org-unit";
}
