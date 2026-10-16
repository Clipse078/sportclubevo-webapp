/**
 * UTF-16 code-unit lexical order — stable across server locale (not `localeCompare` default).
 * Participant ids are technical identifiers (cuid/ASCII); this is not user-facing collation.
 */
export function compareParticipantId(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Canonical participant ordering before round-robin rotation.
 * INPUT_ORDER_DEPENDENCE = NO — retrieval order is normalized here.
 *
 * Policy: ascending displayOrder, then ascending participant id (code-unit lexical).
 */
export function canonicalizeParticipantIds(
  participants: readonly { id: string; displayOrder: number }[],
): string[] {
  return [...participants]
    .sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return compareParticipantId(a.id, b.id);
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
