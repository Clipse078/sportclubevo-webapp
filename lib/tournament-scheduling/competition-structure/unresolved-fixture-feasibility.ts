/**
 * SCE-TOURNAMENT-PLANNER-01E3A — feasibility contract for unresolved fixture sides.
 *
 * Structural feasibility (capacity, window, pitch count) may still apply when sides
 * are qualification references. Participant-specific minimum-rest constraints require
 * concrete participant ids and are conservatively deferred until resolution (01J).
 */

export const UNRESOLVED_FIXTURE_STRUCTURAL_FEASIBILITY =
  "ASSESSABLE_WHEN_FIXTURE_COUNT_AND_DURATION_KNOWN" as const;

export const UNRESOLVED_FIXTURE_PARTICIPANT_REST_FEASIBILITY =
  "NOT_RESOLVED_UNTIL_CONCRETE_PARTICIPANTS_KNOWN" as const;

export interface FixtureSideResolutionForFeasibility {
  sideAParticipantId: string | null;
  sideBParticipantId: string | null;
  hasUnresolvedSide: boolean;
}

/** Maps durable sides to feasibility refs; null participant ids mark unresolved sides. */
export function resolveFixtureSidesForFeasibility(input: {
  sideAParticipantId: string | null;
  sideBParticipantId: string | null;
  sideSources?: readonly {
    side: "A" | "B";
    sourceType: "CONCRETE_PARTICIPANT" | "QUALIFICATION_REFERENCE";
    participantId: string | null;
  }[];
}): FixtureSideResolutionForFeasibility {
  if (input.sideSources && input.sideSources.length > 0) {
    const sideA = input.sideSources.find((s) => s.side === "A");
    const sideB = input.sideSources.find((s) => s.side === "B");
    const aId =
      sideA?.sourceType === "CONCRETE_PARTICIPANT" ? (sideA.participantId ?? null) : null;
    const bId =
      sideB?.sourceType === "CONCRETE_PARTICIPANT" ? (sideB.participantId ?? null) : null;
    return {
      sideAParticipantId: aId,
      sideBParticipantId: bId,
      hasUnresolvedSide:
        sideA?.sourceType === "QUALIFICATION_REFERENCE" ||
        sideB?.sourceType === "QUALIFICATION_REFERENCE",
    };
  }

  return {
    sideAParticipantId: input.sideAParticipantId,
    sideBParticipantId: input.sideBParticipantId,
    hasUnresolvedSide: false,
  };
}
