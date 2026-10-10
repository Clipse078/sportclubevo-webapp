/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01B-R2 — trainer overview provenance (UI only).
 * Normal PLAYER/PARENT responses do not surface relationship in Match Squad rows.
 */

import type { ParticipationResponseSource } from "@prisma/client";
import { getParticipationResponseProvenanceLabel } from "@/lib/match-squad/participation-provenance-labels";

export function getMatchSquadRowProvenanceLabel(
  source: ParticipationResponseSource | null | undefined,
): string | null {
  if (source !== "TRAINER" && source !== "STAFF") {
    return null;
  }
  return getParticipationResponseProvenanceLabel(source);
}
