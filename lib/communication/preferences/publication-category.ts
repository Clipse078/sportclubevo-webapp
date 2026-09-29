import type { PlatformCommunicationKind } from "@prisma/client";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import { sponsorSelectorsAreEmpty } from "@/lib/sponsoring/sponsor-audience-selectors";

function audienceIsSponsorCommercialOnly(audience: CommunicationAudienceSpec): boolean {
  if (!audience?.components?.length) return false;
  let hasSponsor = false;
  for (const component of audience.components) {
    if (component.structural && Object.keys(component.structural).length > 0) {
      return false;
    }
    if (component.explicit?.includePersonIds?.length) {
      return false;
    }
    if (component.savedTargetGroupIds?.length) {
      return false;
    }
    if (component.dynamicRule) {
      return false;
    }
    if (
      component.external?.includeExternalContactIds?.length ||
      component.external?.excludeExternalContactIds?.length
    ) {
      return false;
    }
    if (component.sponsor && !sponsorSelectorsAreEmpty(component.sponsor)) {
      hasSponsor = true;
    }
  }
  return hasSponsor;
}

export function resolvePublicationCommunicationPreferenceCategory(input: {
  kind: PlatformCommunicationKind;
  audienceSpecJson: unknown;
}): CommunicationPreferenceCategory {
  const audience = input.audienceSpecJson as CommunicationAudienceSpec;
  if (audienceIsSponsorCommercialOnly(audience)) {
    return "SPONSOR_COMMERCIAL";
  }
  switch (input.kind) {
    case "ALERT":
      return "CLUB_OPERATIONAL";
    case "ANNOUNCEMENT":
    case "CAMPAIGN":
      return "CLUB_INFORMATION";
    default:
      return "CLUB_OPERATIONAL";
  }
}
