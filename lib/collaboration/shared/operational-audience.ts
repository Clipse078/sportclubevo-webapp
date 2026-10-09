/**
 * SCE-COLLAB-01B — team operational audience helpers (canonical Zielgruppen seam).
 */

import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

export function dedupeTenantTeamIds(teamIds: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of teamIds) {
    const id = raw?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function buildMultiTeamOperationalAudience(teamIds: readonly string[]): CommunicationAudienceSpec {
  const ids = dedupeTenantTeamIds(teamIds);
  if (ids.length === 0) {
    throw new Error("at least one team id is required for operational audience");
  }
  return {
    composition: "UNION",
    components: [
      {
        label: ids.length === 1 ? "Team (default)" : "Teams (Turnier)",
        structural: { teamIds: ids },
      },
    ],
  };
}

export function buildOperationalAudienceForTeamIds(teamIds: readonly string[]): CommunicationAudienceSpec {
  const ids = dedupeTenantTeamIds(teamIds);
  if (ids.length === 0) {
    throw new Error("at least one team id is required for operational audience");
  }
  if (ids.length === 1) {
    return buildMultiTeamOperationalAudience(ids);
  }
  return buildMultiTeamOperationalAudience(ids);
}
