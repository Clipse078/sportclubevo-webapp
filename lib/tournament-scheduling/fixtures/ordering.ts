/**
 * Canonical participant ordering before round-robin rotation.
 * INPUT_ORDER_DEPENDENCE = NO — retrieval order is normalized here.
 *
 * Policy: ascending displayOrder, then ascending participant id (lexicographic).
 */
export function canonicalizeParticipantIds(
  participants: readonly { id: string; displayOrder: number }[],
): string[] {
  return [...participants]
    .sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.id.localeCompare(b.id);
    })
    .map((p) => p.id);
}

import { RoundRobinGenerationValidationError } from "./errors";

export function assertDistinctParticipantIds(participantIds: readonly string[]): void {
  const seen = new Set<string>();
  for (const id of participantIds) {
    if (seen.has(id)) {
      throw new RoundRobinGenerationValidationError(
        "TOURNAMENT_GENERATION_INVALID",
        "Duplicate participant ids in generation input",
      );
    }
    seen.add(id);
  }
}
