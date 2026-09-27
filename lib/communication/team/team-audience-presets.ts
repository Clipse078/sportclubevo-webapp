/**
 * SCE-COMM-04 — structural team audience presets (no saved TargetGroup required).
 *
 * Default operational audience = active TeamSeason roster via structural teamIds.
 * Guardian delivery expansion remains COMM-03 dispatch responsibility.
 */

import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { StructuralAudienceSelectors } from "@/lib/communication/platform/audience/structural-targets";
import { defaultTeamOperationalAudience } from "@/lib/communication/platform/seams/team-communication-seam";

export const TEAM_AUDIENCE_PRESETS = [
  "ALL",
  "PLAYERS",
  "TRAINERS_STAFF",
] as const;

export type TeamAudiencePreset = (typeof TEAM_AUDIENCE_PRESETS)[number];

export function isTeamAudiencePreset(value: string): value is TeamAudiencePreset {
  return (TEAM_AUDIENCE_PRESETS as readonly string[]).includes(value);
}

export function teamAudienceSpecForPreset(
  teamId: string,
  preset: TeamAudiencePreset = "ALL",
): CommunicationAudienceSpec {
  const trimmedTeamId = teamId.trim();
  switch (preset) {
    case "ALL":
      return defaultTeamOperationalAudience(trimmedTeamId);
    case "TRAINERS_STAFF":
      return {
        composition: "INTERSECTION",
        components: [
          {
            label: "Team trainers/staff",
            structural: { teamIds: [trimmedTeamId], roleKeys: ["trainer"] },
          },
        ],
      };
    case "PLAYERS":
      return {
        composition: "UNION",
        components: [
          {
            label: "Team players",
            structural: { teamIds: [trimmedTeamId] },
          },
        ],
      };
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

/** Structural exclusions applied at dispatch for PLAYERS preset. */
export function structuralExclusionForTeamAudiencePreset(
  teamId: string,
  preset: TeamAudiencePreset,
): StructuralAudienceSelectors | undefined {
  if (preset !== "PLAYERS") return undefined;
  return { roleKeys: ["trainer"], teamIds: [teamId.trim()] };
}
