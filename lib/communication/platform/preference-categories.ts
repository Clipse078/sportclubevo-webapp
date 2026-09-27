/**
 * SCE-COMM-01 — communication eligibility categories (separate from Zielgruppe membership).
 *
 * Operational team traffic and sponsor commercial campaigns MUST NOT share
 * implicit consent rules. Jurisdiction-specific legal conclusions belong in
 * tenant policy configuration (COMM-17), not hard-coded here.
 */

export const COMMUNICATION_PREFERENCE_CATEGORIES = [
  "TEAM_OPERATIONAL",
  "CLUB_OPERATIONAL",
  "CLUB_INFORMATION",
  "SPONSOR_COMMERCIAL",
] as const;

export type CommunicationPreferenceCategory =
  (typeof COMMUNICATION_PREFERENCE_CATEGORIES)[number];

export type CommunicationChannelEligibility = "IN_APP" | "PUSH" | "EMAIL";

export function isCommunicationPreferenceCategory(
  value: string,
): value is CommunicationPreferenceCategory {
  return (COMMUNICATION_PREFERENCE_CATEGORIES as readonly string[]).includes(value);
}

/** Default channel eligibility hints — overridable per tenant/user in COMM-17. */
export const DEFAULT_CATEGORY_CHANNEL_ELIGIBILITY: Record<
  CommunicationPreferenceCategory,
  readonly CommunicationChannelEligibility[]
> = {
  TEAM_OPERATIONAL: ["IN_APP", "PUSH", "EMAIL"],
  CLUB_OPERATIONAL: ["IN_APP", "PUSH", "EMAIL"],
  CLUB_INFORMATION: ["IN_APP", "EMAIL"],
  SPONSOR_COMMERCIAL: ["EMAIL", "IN_APP"],
};
