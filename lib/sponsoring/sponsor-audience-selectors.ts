/**
 * SCE-COMM-13 — Sponsor-owned audience selector contract (referenced by CommunicationAudienceSpec).
 */

export type SponsorAudienceSelectors = {
  /** All contacts under ACTIVE sponsor organisations at resolution time. */
  allActiveSponsors?: boolean;
  sponsorOrganisationIds?: string[];
  sponsorContactIds?: string[];
  sponsorCategoryIds?: string[];
};

export function sponsorSelectorsAreEmpty(selectors: SponsorAudienceSelectors | undefined): boolean {
  if (!selectors) return true;
  if (selectors.allActiveSponsors) return false;
  return (
    (selectors.sponsorOrganisationIds?.length ?? 0) === 0 &&
    (selectors.sponsorContactIds?.length ?? 0) === 0 &&
    (selectors.sponsorCategoryIds?.length ?? 0) === 0
  );
}
