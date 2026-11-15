import type { ClubStrategyAuthoringDto } from "@/lib/club-development/club-strategy-service";
import type { InitiativeProgressSnapshot } from "@/lib/club-development/initiative-progress";

/**
 * Client-safe presentation of canonical initiative delivery progress (matches server snapshot).
 * Stored `Initiative.progress` is a write-through cache only — always compute at read time.
 */
export function initiativeDeliveryProgressPercentFromSnapshot(
  snapshot: Pick<InitiativeProgressSnapshot, "progress">,
): number {
  return Math.min(100, Math.max(0, snapshot.progress));
}

/** Supporting-material counts for strategy UI — documents restricted to accessible items. */
export function strategySupportingMaterialCounts(
  dto: Pick<ClubStrategyAuthoringDto, "meetingRefs" | "decisionRefs" | "documentReferences">,
): { meetings: number; decisions: number; documents: number } {
  return {
    meetings: dto.meetingRefs.length,
    decisions: dto.decisionRefs.length,
    documents: dto.documentReferences.filter((row) => row.presentation.accessible).length,
  };
}