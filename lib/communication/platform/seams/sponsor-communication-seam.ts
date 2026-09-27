/**
 * SCE-COMM-01 — Sponsor consumes canonical Communication; does not own engines.
 */

import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type { CommunicationKind } from "@/lib/communication/platform/communication-kinds";

export function sponsorCampaignContext(sponsorId: string): CommunicationContextRef {
  return { kind: "SPONSOR", sponsorId: sponsorId.trim() };
}

/** Campaign composer entry — context pre-selected, audience still canonical Zielgruppe engine. */
export type SponsorCampaignComposerLaunch = {
  tenantId: string;
  /** SponsorOrganisation.id */
  sponsorOrganisationId: string;
  communicationKind: Extract<CommunicationKind, "CAMPAIGN">;
  /** Optional explicit SponsorContact.id preselection. */
  sponsorContactIds?: readonly string[];
  /** Authorisation checked against sponsor + org communication permissions. */
  launchedByUserId: string;
};

export function sponsorCampaignComposerHref(input: {
  sponsorOrganisationId: string;
  sponsorContactIds?: readonly string[];
}): string {
  const params = new URLSearchParams();
  params.set("sponsorOrganisationId", input.sponsorOrganisationId.trim());
  for (const id of input.sponsorContactIds ?? []) {
    if (id.trim()) params.append("sponsorContactId", id.trim());
  }
  return `/dashboard/communication/kampagnen/new?${params.toString()}`;
}
