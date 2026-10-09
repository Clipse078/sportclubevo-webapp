/**
 * SCE-COLLAB-01B — canonical match venue/resource labels for change detection.
 */

import { resolveCanonicalPitchPresentationLabel } from "@/lib/publishing/presentation/canonical-pitch-presentation";

export type MatchPitchResourceContext = {
  code: string;
  name: string | null;
  facilityName: string | null;
  resourceType?: "FULL_PITCH" | "HALF_PITCH" | "DRESSING_ROOM" | "OTHER";
};

export function formatMatchPitchLabel(
  pitchCode: string | null | undefined,
  resourceByCode: ReadonlyMap<string, MatchPitchResourceContext>,
): string | null {
  const code = pitchCode?.trim();
  if (!code) return null;
  const resource = resourceByCode.get(code);
  if (resource) {
    return (
      resolveCanonicalPitchPresentationLabel({
        code: resource.code,
        name: resource.name,
        facilityName: resource.facilityName,
        resourceType: resource.resourceType,
      }) ?? code
    );
  }
  return code;
}

export function formatMatchPlayableVenueLabel(input: {
  location: string | null | undefined;
  pitchLabel: string | null | undefined;
}): string | null {
  const location = input.location?.trim() || null;
  const pitch = input.pitchLabel?.trim() || null;
  if (location && pitch) return `${location} · ${pitch}`;
  return location ?? pitch;
}

export function formatMatchHomeDressingRoomLabel(
  code: string | null | undefined,
  dressingRoomByCode: ReadonlyMap<string, MatchPitchResourceContext>,
): string | null {
  return formatMatchPitchLabel(code, dressingRoomByCode);
}
