/**
 * SCE-COMM-13 — Communication-side audience builders referencing Sponsor selectors.
 */

import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { SponsorAudienceSelectors } from "@/lib/sponsoring/sponsor-audience-selectors";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

export function audienceSpecFromSponsorSelectors(
  selectors: SponsorAudienceSelectors,
): CommunicationAudienceSpec {
  return {
    composition: "UNION",
    components: [{ sponsor: selectors }],
  };
}

export function audienceSpecFromAllActiveSponsors(): CommunicationAudienceSpec {
  return audienceSpecFromSponsorSelectors({ allActiveSponsors: true });
}

export function audienceSpecFromSponsorOrganisationIds(
  sponsorOrganisationIds: readonly string[],
): CommunicationAudienceSpec {
  const ids = [...new Set(sponsorOrganisationIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    throw new TeamCommunicationValidationError("at least one sponsor organisation is required");
  }
  return audienceSpecFromSponsorSelectors({ sponsorOrganisationIds: ids });
}

export function audienceSpecFromSponsorContactIds(
  sponsorContactIds: readonly string[],
): CommunicationAudienceSpec {
  const ids = [...new Set(sponsorContactIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    throw new TeamCommunicationValidationError("at least one sponsor contact is required");
  }
  return audienceSpecFromSponsorSelectors({ sponsorContactIds: ids });
}

/** Preselect sponsor audience when launching composer from Sponsor module (Flow A). */
export function sponsorCampaignAudiencePreselect(input: {
  sponsorOrganisationId: string;
  sponsorContactIds?: readonly string[];
}): CommunicationAudienceSpec {
  const orgId = input.sponsorOrganisationId.trim();
  if (!orgId) {
    throw new TeamCommunicationValidationError("sponsor organisation id is required");
  }
  const contactIds = [...new Set((input.sponsorContactIds ?? []).map((id) => id.trim()).filter(Boolean))];
  if (contactIds.length > 0) {
    return {
      composition: "UNION",
      components: [
        {
          sponsor: {
            sponsorOrganisationIds: [orgId],
            sponsorContactIds: contactIds,
          },
        },
      ],
    };
  }
  return audienceSpecFromSponsorOrganisationIds([orgId]);
}
