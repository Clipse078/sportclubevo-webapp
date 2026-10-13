import type { SceClubEventAudiencePresentation } from "./types";

/**
 * Target event **scope** (who the event concerns) — not participation invitees,
 * not publication visibility, not organiser/host.
 *
 * Persistence for CLUB_WIDE vs multi-team scope is not wired in 01G-R1; see
 * docs/roadmap/SCE-UI-ROLLOUT-01G-R1-TEAM-AUDIENCE-ARCHITECTURE.md.
 */
export type SceClubEventAudienceScope = "CLUB_WIDE" | "SELECTED_TEAMS";

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
  if (audience.scope === "SELECTED_TEAMS" && audience.teamCount && audience.teamCount > 1) {
    return `${audience.teamCount} Teams`;
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
