/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01B — canonical response provenance labels (UI only).
 */

import type { ParticipationResponseSource } from "@prisma/client";

export function getParticipationResponseProvenanceLabel(
  source: ParticipationResponseSource | null | undefined,
): string | null {
  switch (source) {
    case "PLAYER":
      return "Vom Spieler bestätigt";
    case "PARENT":
      return "Von Eltern bestätigt";
    case "TRAINER":
      return "Vom Trainer eingetragen";
    case "STAFF":
      return "Vom Staff eingetragen";
    default:
      return null;
  }
}
