import { compareParticipantId } from "../fixtures/ordering";
import type { ParticipantSlotMapping, TemplateParticipantSlotId } from "./types";
import { participantSlotsForCount } from "./template-side-ref";

export type TournamentParticipantOrderingRow = {
  id: string;
  displayOrder: number;
};

/**
 * Map real participants to abstract template slots (A, B, C, …) deterministically.
 * Ordering: displayOrder asc, then participant id asc — independent of display-name sorting.
 */
export function mapParticipantsToTemplateSlots(input: {
  participants: readonly TournamentParticipantOrderingRow[];
  participantCount: number;
}): ParticipantSlotMapping {
  const slots = participantSlotsForCount(input.participantCount);
  if (input.participants.length !== input.participantCount) {
    throw new Error(
      `Participant count mismatch: expected ${input.participantCount}, got ${input.participants.length}`,
    );
  }
  const sorted = [...input.participants].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return compareParticipantId(a.id, b.id);
  });
  const mapping = {} as Record<TemplateParticipantSlotId, string>;
  slots.forEach((slot, index) => {
    mapping[slot] = sorted[index]!.id;
  });
  return mapping;
}
