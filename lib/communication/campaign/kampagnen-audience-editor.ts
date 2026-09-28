import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { sponsorSelectorsAreEmpty } from "@/lib/sponsoring/sponsor-audience-selectors";

export type KampagnenAudienceEditorMode = "WHOLE_ORG" | "TARGET_GROUPS" | "SPONSORS";

export function inferKampagnenAudienceEditorState(audience: CommunicationAudienceSpec): {
  mode: KampagnenAudienceEditorMode;
  selectedGroupIds: string[];
  sponsorMode: "ALL_ACTIVE" | "SELECTED";
  sponsorOrganisationIds: string[];
  sponsorContactIds: string[];
} {
  const groupIds = new Set<string>();
  let wholeOrg = false;
  let sponsorAllActive = false;
  const sponsorOrgIds = new Set<string>();
  const sponsorContactIds = new Set<string>();

  for (const component of audience.components) {
    if (component.structural?.wholeOrganisation) wholeOrg = true;
    for (const id of component.savedTargetGroupIds ?? []) {
      groupIds.add(id);
    }
    if (component.sponsor && !sponsorSelectorsAreEmpty(component.sponsor)) {
      if (component.sponsor.allActiveSponsors) sponsorAllActive = true;
      for (const id of component.sponsor.sponsorOrganisationIds ?? []) {
        sponsorOrgIds.add(id);
      }
      for (const id of component.sponsor.sponsorContactIds ?? []) {
        sponsorContactIds.add(id);
      }
    }
  }

  if (sponsorAllActive || sponsorOrgIds.size > 0 || sponsorContactIds.size > 0) {
    return {
      mode: "SPONSORS",
      selectedGroupIds: [],
      sponsorMode: sponsorAllActive ? "ALL_ACTIVE" : "SELECTED",
      sponsorOrganisationIds: [...sponsorOrgIds],
      sponsorContactIds: [...sponsorContactIds],
    };
  }

  if (groupIds.size > 0) {
    return {
      mode: "TARGET_GROUPS",
      selectedGroupIds: [...groupIds],
      sponsorMode: "ALL_ACTIVE",
      sponsorOrganisationIds: [],
      sponsorContactIds: [],
    };
  }

  return {
    mode: wholeOrg ? "WHOLE_ORG" : "WHOLE_ORG",
    selectedGroupIds: [],
    sponsorMode: "ALL_ACTIVE",
    sponsorOrganisationIds: [],
    sponsorContactIds: [],
  };
}
