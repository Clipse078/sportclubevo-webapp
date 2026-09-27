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
  sponsorId: string;
  communicationKind: Extract<CommunicationKind, "CAMPAIGN">;
  /** Authorisation checked against sponsor + org communication permissions. */
  launchedByUserId: string;
};
