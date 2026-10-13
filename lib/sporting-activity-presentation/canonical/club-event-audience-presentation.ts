import type { SceClubEventAudiencePresentation } from "./types";

/**
 * Target event **scope** (who the event concerns) — not participation invitees,
 * not publication visibility, not organiser/host.
 *
 * Authoritative scope persistence: SCE-CLUB-EVENT-AUDIENCE-01.
 */
export type SceClubEventAudienceScope = "CLUB_WIDE" | "SELECTED_ORG_UNITS";

export function formatSceClubEventAudiencePrimaryLabel(
  audience: SceClubEventAudiencePresentation,
): string {
  return audience.primaryLabel.trim();
}

/** Concise density label e.g. «3 Teams» when detail labels exist but space is tight. */
export function formatSceClubEventAudienceCompactLabel(
  audience: SceClubEventAudiencePresentation,
): string {
  if (audience.compactLabel?.trim()) {
    return audience.compactLabel.trim();
  }
  if (
    audience.scope === "SELECTED_ORG_UNITS" &&
    audience.targetCount &&
    audience.targetCount > 1
  ) {
    if (audience.teamCount && audience.teamCount === audience.targetCount) {
      return `${audience.targetCount} Teams`;
    }
    return `${audience.targetCount} Organisationseinheiten`;
  }
  return formatSceClubEventAudiencePrimaryLabel(audience);
}

export function sceClubEventAudienceAccessibleDetail(
  audience: SceClubEventAudiencePresentation,
): string | undefined {
  const details = audience.detailLabels?.map((l) => l.trim()).filter(Boolean);
  if (!details?.length) return undefined;
  return details.join(", ");
}
